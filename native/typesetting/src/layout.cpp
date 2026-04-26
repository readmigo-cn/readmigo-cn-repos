#include "typesetting/layout.h"
#include "typesetting/style_resolver.h"
#include "typesetting/log.h"
#include <algorithm>

namespace typesetting {

namespace {

/// Return the byte length of a UTF-8 character given its lead byte.
static size_t utf8CharLen(unsigned char c) {
    if (c < 0x80) return 1;
    if ((c & 0xE0) == 0xC0) return 2;
    if ((c & 0xF0) == 0xE0) return 3;
    if ((c & 0xF8) == 0xF0) return 4;
    return 1;
}

/// Decode a UTF-8 codepoint starting at text[pos]. Advances pos past the decoded bytes.
static uint32_t utf8Decode(const std::string& text, size_t& pos) {
    unsigned char lead = static_cast<unsigned char>(text[pos]);
    size_t len = utf8CharLen(lead);
    if (pos + len > text.size()) { pos++; return 0xFFFD; }
    if (len == 1) { pos++; return lead; }
    uint32_t cp;
    if (len == 2) cp = lead & 0x1F;
    else if (len == 3) cp = lead & 0x0F;
    else cp = lead & 0x07;
    for (size_t i = 1; i < len; i++) {
        cp = (cp << 6) | (static_cast<unsigned char>(text[pos + i]) & 0x3F);
    }
    pos += len;
    return cp;
}

/// Encode a Unicode codepoint as UTF-8 and append to the string.
static void utf8Append(uint32_t cp, std::string& out) {
    if (cp < 0x80) {
        out += static_cast<char>(cp);
    } else if (cp < 0x800) {
        out += static_cast<char>(0xC0 | (cp >> 6));
        out += static_cast<char>(0x80 | (cp & 0x3F));
    } else if (cp < 0x10000) {
        out += static_cast<char>(0xE0 | (cp >> 12));
        out += static_cast<char>(0x80 | ((cp >> 6) & 0x3F));
        out += static_cast<char>(0x80 | (cp & 0x3F));
    } else {
        out += static_cast<char>(0xF0 | (cp >> 18));
        out += static_cast<char>(0x80 | ((cp >> 12) & 0x3F));
        out += static_cast<char>(0x80 | ((cp >> 6) & 0x3F));
        out += static_cast<char>(0x80 | (cp & 0x3F));
    }
}

/// Convert a Unicode codepoint to uppercase (ASCII + Latin-1 Supplement).
static uint32_t codepointToUpper(uint32_t cp) {
    if (cp >= 'a' && cp <= 'z') return cp - 32;
    if (cp >= 0x00E0 && cp <= 0x00F6) return cp - 32;  // à-ö → À-Ö
    if (cp >= 0x00F8 && cp <= 0x00FE) return cp - 32;  // ø-þ → Ø-Þ
    if (cp == 0x00FF) return 0x0178;                     // ÿ → Ÿ
    return cp;
}

/// Convert a Unicode codepoint to lowercase (ASCII + Latin-1 Supplement).
static uint32_t codepointToLower(uint32_t cp) {
    if (cp >= 'A' && cp <= 'Z') return cp + 32;
    if (cp >= 0x00C0 && cp <= 0x00D6) return cp + 32;  // À-Ö → à-ö
    if (cp >= 0x00D8 && cp <= 0x00DE) return cp + 32;  // Ø-Þ → ø-þ
    if (cp == 0x0178) return 0x00FF;                     // Ÿ → ÿ
    return cp;
}

std::string applyTextTransform(const std::string& text, TextTransform transform) {
    if (transform == TextTransform::None) return text;
    std::string result;
    result.reserve(text.size());
    bool newWord = true;
    size_t pos = 0;
    while (pos < text.size()) {
        uint32_t cp = utf8Decode(text, pos);
        if (transform == TextTransform::Uppercase) {
            cp = codepointToUpper(cp);
        } else if (transform == TextTransform::Lowercase) {
            cp = codepointToLower(cp);
        } else { // Capitalize
            if (cp == ' ' || cp == '\t' || cp == '\n' || cp == '\r') {
                newWord = true;
            } else if (newWord) {
                cp = codepointToUpper(cp);
                newWord = false;
            }
        }
        utf8Append(cp, result);
    }
    return result;
}

/// Convert a character count (UTF-16 units) to a UTF-8 byte offset.
static size_t charCountToByteOffset(const std::string& text, size_t charCount) {
    size_t bytePos = 0;
    size_t chars = 0;
    while (bytePos < text.size() && chars < charCount) {
        size_t len = utf8CharLen(static_cast<unsigned char>(text[bytePos]));
        if (bytePos + len > text.size()) break;
        bytePos += len;
        chars += (len == 4) ? 2 : 1;
    }
    return bytePos;
}

} // anonymous namespace

class LayoutEngine::Impl {
public:
    explicit Impl(std::shared_ptr<PlatformAdapter> platform)
        : platform_(std::move(platform)) {}

    // ---------------------------------------------------------------
    // OLD overload: Style-based (backward compatible)
    // ---------------------------------------------------------------
    LayoutResult layoutChapter(const Chapter& chapter,
                               const Style& style,
                               const PageSize& pageSize) {
        CSSStylesheet emptySheet;
        StyleResolver resolver(emptySheet);
        auto resolved = resolver.resolve(chapter.blocks, style);
        return layoutChapter(chapter, resolved, style, pageSize);
    }

    // ---------------------------------------------------------------
    // BlockComputedStyle-based with explicit page margins
    // ---------------------------------------------------------------
    LayoutResult layoutChapter(const Chapter& chapter,
                               const std::vector<BlockComputedStyle>& styles,
                               const Style& pageStyle,
                               const PageSize& pageSize) {
        ResolvedStyles resolved;
        resolved.blockStyles = styles;
        resolved.inlineStyles.resize(styles.size()); // empty inline styles per block
        return layoutChapter(chapter, resolved, pageStyle, pageSize);
    }

    std::vector<Line> layoutBlock(const Block& block,
                                  const Style& style,
                                  float availableWidth) {
        CSSStylesheet emptySheet;
        StyleResolver resolver(emptySheet);
        std::vector<Block> singleBlock = {block};
        auto resolved = resolver.resolve(singleBlock, style);
        std::vector<InlineComputedStyle> emptyInlineStyles;
        return layoutBlockLines(block, resolved.blockStyles[0],
                                resolved.inlineStyles.empty() ? emptyInlineStyles : resolved.inlineStyles[0],
                                availableWidth, 0);
    }

private:
    std::shared_ptr<PlatformAdapter> platform_;
    std::string locale_ = "en";
    bool hyphenationEnabled_ = false;

    // ---------------------------------------------------------------
    // Core implementation with ResolvedStyles + page margins from Style
    // ---------------------------------------------------------------
    LayoutResult layoutChapter(const Chapter& chapter,
                               const ResolvedStyles& resolved,
                               const Style& pageStyle,
                               const PageSize& pageSize) {
        locale_ = pageStyle.locale;
        hyphenationEnabled_ = pageStyle.hyphenation;

        LayoutResult result;
        result.chapterId = chapter.id;
        result.totalBlocks = static_cast<int>(chapter.blocks.size());

        float contentWidth = pageStyle.contentWidth(pageSize.width);
        float contentHeight = pageStyle.contentHeight(pageSize.height);
        float contentX = pageStyle.marginLeft;
        float contentY = pageStyle.marginTop;

        float cursorY = 0;
        Page currentPage;
        currentPage.pageIndex = 0;
        currentPage.width = pageSize.width;
        currentPage.height = pageSize.height;
        currentPage.contentX = contentX;
        currentPage.contentY = contentY;
        currentPage.contentWidth = contentWidth;
        currentPage.contentHeight = contentHeight;
        currentPage.firstBlockIndex = 0;

        auto startNewPage = [&](int blockIdx) {
            currentPage.lastBlockIndex = blockIdx - 1;
            result.pages.push_back(currentPage);
            currentPage = Page{};
            currentPage.pageIndex = static_cast<int>(result.pages.size());
            currentPage.width = pageSize.width;
            currentPage.height = pageSize.height;
            currentPage.contentX = contentX;
            currentPage.contentY = contentY;
            currentPage.contentWidth = contentWidth;
            currentPage.contentHeight = contentHeight;
            currentPage.firstBlockIndex = blockIdx;
            cursorY = 0;
            TS_LOGD("layout: newPage pageIndex=%d blockIdx=%d", currentPage.pageIndex, blockIdx);
        };

        for (int blockIdx = 0; blockIdx < static_cast<int>(chapter.blocks.size()); ++blockIdx) {
            const auto& block = chapter.blocks[blockIdx];
            const auto& bstyle = resolved.blockStyles[blockIdx];

            // Hidden blocks (display: none) — skip entirely
            if (bstyle.hidden) {
                continue;
            }

            // break-before: page — force a new page before this block
            if (bstyle.breakBeforePage && (!currentPage.lines.empty() || !currentPage.decorations.empty())) {
                startNewPage(blockIdx);
            }

            // Handle horizontal rule
            if (block.type == BlockType::HorizontalRule) {
                float hrMarginTop = 0;
                float hrMarginBottom = 0;
                float hrBorderWidth = 1.0f;
                float hrWidthPercent = 25.0f;

                if (bstyle.hrStyle.has_value()) {
                    const auto& hr = bstyle.hrStyle.value();
                    hrMarginTop = hr.marginTopEm * bstyle.font.size;
                    hrMarginBottom = hr.marginBottomEm * bstyle.font.size;
                    hrBorderWidth = hr.borderWidth;
                    hrWidthPercent = hr.widthPercent;
                } else {
                    hrMarginTop = bstyle.font.size * 1.5f;
                    hrMarginBottom = bstyle.font.size * 1.5f;
                }

                float hrTotalHeight = hrMarginTop + hrBorderWidth + hrMarginBottom;

                if (cursorY + hrTotalHeight > contentHeight && !currentPage.lines.empty()) {
                    startNewPage(blockIdx);
                }

                // Create decoration
                float hrWidth = hrWidthPercent / 100.0f * contentWidth;
                float hrX = contentX + (contentWidth - hrWidth) / 2.0f;
                float hrY = contentY + cursorY + hrMarginTop;

                Decoration decoration;
                decoration.type = DecorationType::HorizontalRule;
                decoration.x = hrX;
                decoration.y = hrY;
                decoration.width = hrWidth;
                decoration.height = hrBorderWidth;
                currentPage.decorations.push_back(decoration);

                cursorY += hrTotalHeight;
                continue;
            }

            // Handle image blocks
            if (block.type == BlockType::Image) {
                // Determine CSS class constraints from parent figure element
                bool isFullPage = block.parentClassName.find("full-page") != std::string::npos;
                bool isHalfPage = block.parentClassName.find("half-page") != std::string::npos;

                float imageWidth = isHalfPage ? contentWidth * 0.5f : contentWidth;
                // Default placeholder ratio: portrait-friendly (1.2 ≈ typical book illustration)
                float imageHeight = imageWidth * 1.2f;

                if (isFullPage) {
                    // full-page: fill entire content area regardless of image dimensions
                    imageWidth = contentWidth;
                    imageHeight = contentHeight;
                    TS_LOGD("layout: image src='%s' full-page forced=%.0fx%.0f",
                            block.src.c_str(), imageWidth, imageHeight);
                } else {
                    // Try to get actual image dimensions from platform
                    auto imgSize = platform_->getImageSize(block.src);
                    if (imgSize.has_value() && imgSize->width > 0 && imgSize->height > 0) {
                        float scale = imageWidth / imgSize->width;
                        imageHeight = imgSize->height * scale;
                        // Respect max-height: 100vh
                        if (imageHeight > contentHeight) {
                            imageHeight = contentHeight;
                            imageWidth = imgSize->width * (contentHeight / imgSize->height);
                        }
                        TS_LOGD("layout: image src='%s' native=%.0fx%.0f scaled=%.0fx%.0f",
                                block.src.c_str(), imgSize->width, imgSize->height,
                                imageWidth, imageHeight);
                    } else {
                        TS_LOGD("layout: image src='%s' no dimensions, placeholder=%.0fx%.0f",
                                block.src.c_str(), imageWidth, imageHeight);
                    }
                }

                if (cursorY + imageHeight > contentHeight && !currentPage.lines.empty()) {
                    startNewPage(blockIdx);
                }

                // Create image placeholder decoration (horizontally centered)
                Decoration imgDeco;
                imgDeco.type = DecorationType::ImagePlaceholder;
                imgDeco.x = contentX + (contentWidth - imageWidth) / 2.0f;
                imgDeco.y = contentY + cursorY;
                imgDeco.width = imageWidth;
                imgDeco.height = imageHeight;
                imgDeco.imageSrc = block.src;
                imgDeco.imageAlt = block.alt;
                currentPage.decorations.push_back(imgDeco);

                cursorY += imageHeight;

                // If there's a caption, lay it out as text below the image
                if (!block.caption.empty()) {
                    float captionSpacing = bstyle.font.size * 0.5f;
                    cursorY += captionSpacing;

                    // Create a temporary block for the caption
                    Block captionBlock;
                    captionBlock.type = BlockType::Figcaption;
                    captionBlock.inlines.push_back(InlineElement::plain(block.caption));

                    BlockComputedStyle captionStyle = bstyle;
                    captionStyle.font.size = bstyle.font.size * 0.85f;
                    captionStyle.font.style = FontStyle::Italic;
                    captionStyle.alignment = TextAlignment::Center;
                    captionStyle.textIndent = 0;

                    auto captionLines = layoutBlockLines(captionBlock, captionStyle, {}, contentWidth, blockIdx);
                    for (auto& line : captionLines) {
                        if (cursorY + line.height > contentHeight && !currentPage.lines.empty()) {
                            startNewPage(blockIdx);
                        }
                        line.y = contentY + cursorY + line.ascent;
                        line.x = contentX;
                        applyAlignment(line, captionStyle.alignment, contentWidth);
                        for (auto& run : line.runs) {
                            run.x += contentX;
                            run.y = line.y;
                        }
                        currentPage.lines.push_back(line);
                        cursorY += line.height;
                    }
                }

                cursorY += bstyle.paragraphSpacingAfter;

                // break-after: page for image blocks
                if (bstyle.breakAfterPage && (!currentPage.lines.empty() || !currentPage.decorations.empty())) {
                    startNewPage(blockIdx + 1);
                }
                continue;
            }

            // Handle table blocks
            if (block.type == BlockType::Table) {
                if (!block.tableRows.empty()) {
                    float tableMarginTop = bstyle.font.size;
                    float tableMarginBottom = bstyle.font.size;
                    cursorY += tableMarginTop;

                    // Determine number of columns
                    int maxCols = 0;
                    for (const auto& row : block.tableRows) {
                        int rowCols = 0;
                        for (const auto& cell : row.cells) {
                            rowCols += cell.colspan;
                        }
                        if (rowCols > maxCols) maxCols = rowCols;
                    }
                    if (maxCols == 0) maxCols = 1;
                    TS_LOGD("layout: table rows=%zu cols=%d cellWidth=%.1f",
                            block.tableRows.size(), maxCols,
                            contentWidth / static_cast<float>(maxCols));

                    float cellWidth = contentWidth / static_cast<float>(maxCols);
                    float cellPadding = bstyle.font.size * 0.3f;
                    float tableBorderWidth = bstyle.borderCollapse ? 0.5f : 1.0f;
                    float cellBorderLeft = bstyle.borderLeftWidth;

                    // Draw outer table border
                    float tableStartY = contentY + cursorY;

                    // Layout each row
                    for (const auto& row : block.tableRows) {
                        float rowHeight = 0;
                        float cellX = 0;

                        // First pass: calculate row height
                        for (const auto& cell : row.cells) {
                            float thisCellWidth = cellWidth * cell.colspan - cellPadding * 2;
                            if (thisCellWidth < 1) thisCellWidth = 1;

                            Block cellBlock;
                            cellBlock.type = BlockType::Paragraph;
                            cellBlock.inlines = cell.inlines;

                            BlockComputedStyle cellStyle = bstyle;
                            cellStyle.textIndent = 0;
                            cellStyle.alignment = TextAlignment::Left;
                            if (cell.isHeader) {
                                cellStyle.font.weight = FontWeight::Bold;
                            }

                            auto cellLines = layoutBlockLines(cellBlock, cellStyle, {}, thisCellWidth, blockIdx);
                            float cellHeight = cellPadding * 2;
                            for (const auto& cl : cellLines) {
                                cellHeight += cl.height;
                            }
                            if (cellHeight > rowHeight) rowHeight = cellHeight;
                        }

                        // Check page break
                        if (cursorY + rowHeight > contentHeight && !currentPage.lines.empty()) {
                            startNewPage(blockIdx);
                        }

                        // Second pass: place cell content
                        cellX = 0;
                        for (const auto& cell : row.cells) {
                            float thisCellWidth = cellWidth * cell.colspan - cellPadding * 2;
                            if (thisCellWidth < 1) thisCellWidth = 1;

                            Block cellBlock;
                            cellBlock.type = BlockType::Paragraph;
                            cellBlock.inlines = cell.inlines;

                            BlockComputedStyle cellStyle = bstyle;
                            cellStyle.textIndent = 0;
                            cellStyle.alignment = TextAlignment::Left;
                            if (cell.isHeader) {
                                cellStyle.font.weight = FontWeight::Bold;
                            }

                            auto cellLines = layoutBlockLines(cellBlock, cellStyle, {}, thisCellWidth, blockIdx);
                            float cellCursorY = cursorY + cellPadding;

                            for (auto& line : cellLines) {
                                line.y = contentY + cellCursorY + line.ascent;
                                line.x = contentX + cellX + cellPadding;
                                applyAlignment(line, cellStyle.alignment, thisCellWidth);
                                for (auto& run : line.runs) {
                                    run.x += contentX + cellX + cellPadding;
                                    run.y = line.y;
                                }
                                currentPage.lines.push_back(line);
                                cellCursorY += line.height;
                            }

                            // Cell border decoration
                            Decoration cellBorder;
                            cellBorder.type = DecorationType::TableBorder;
                            cellBorder.x = contentX + cellX;
                            cellBorder.y = contentY + cursorY;
                            cellBorder.width = cellWidth * cell.colspan;
                            cellBorder.height = rowHeight;
                            cellBorder.borderWidth = tableBorderWidth;
                            cellBorder.borderLeftWidth = cellBorderLeft;
                            cellBorder.borderCollapse = bstyle.borderCollapse;
                            currentPage.decorations.push_back(cellBorder);

                            cellX += cellWidth * cell.colspan;
                        }

                        cursorY += rowHeight;
                    }

                    cursorY += tableMarginBottom;
                }
                continue;
            }

            // Text blocks
            // Spacing before.
            // Normally the very first block (blockIdx == 0) of a chapter skips
            // its margin-top to avoid double-spacing at the page top (the page
            // already provides pageStyle.marginTop). But certain semantic
            // sections — like dedication / epigraph — explicitly want a large
            // top offset to position content in the upper-third of the page,
            // so we honor margin-top on their first block as well.
            bool isSpecialSemanticChapter = false;
            for (const auto& a : block.ancestors) {
                if (a.epubType.find("dedication") != std::string::npos ||
                    a.epubType.find("epigraph") != std::string::npos) {
                    isSpecialSemanticChapter = true;
                    break;
                }
            }
            if ((blockIdx > 0 || isSpecialSemanticChapter) && bstyle.marginTop > 0) {
                cursorY += bstyle.marginTop;
            }

            // Available width accounting for block margins and padding
            float baseAvailableWidth = contentWidth - bstyle.marginLeft - bstyle.marginRight - bstyle.paddingLeft - bstyle.paddingRight;
            float availableWidth = baseAvailableWidth;
            float blockOffsetX = bstyle.marginLeft + bstyle.paddingLeft;

            // Apply width constraint (fixed percentage or px)
            if (bstyle.widthPx > 0) {
                if (bstyle.widthPx < availableWidth) {
                    availableWidth = bstyle.widthPx;
                }
            } else if (bstyle.widthPercent > 0) {
                float fixedWidth = contentWidth * bstyle.widthPercent / 100.0f;
                if (fixedWidth < availableWidth) {
                    availableWidth = fixedWidth;
                }
            }

            // Apply max-width constraint (percentage)
            if (bstyle.maxWidthPercent < 100.0f) {
                float maxWidth = contentWidth * bstyle.maxWidthPercent / 100.0f;
                if (maxWidth < availableWidth) {
                    availableWidth = maxWidth;
                }
            }

            // Apply max-width constraint (px from em/px CSS values)
            if (bstyle.maxWidthPx > 0 && bstyle.maxWidthPx < availableWidth) {
                availableWidth = bstyle.maxWidthPx;
            }

            // Apply horizontal centering (margin: auto)
            if (bstyle.horizontalCentering && availableWidth < baseAvailableWidth) {
                float extraSpace = baseAvailableWidth - availableWidth;
                blockOffsetX = bstyle.paddingLeft + extraSpace / 2.0f;
            }

            // Layout text into lines
            static const std::vector<InlineComputedStyle> emptyInlineStyles;
            const auto& blockInlineStyles = (blockIdx < static_cast<int>(resolved.inlineStyles.size()))
                ? resolved.inlineStyles[blockIdx] : emptyInlineStyles;
            std::vector<Line> lines = layoutBlockLines(block, bstyle, blockInlineStyles, availableWidth, blockIdx);

            // break-inside: avoid — if all lines fit on one page, keep together
            if (bstyle.breakInsideAvoid && !lines.empty()) {
                float totalHeight = 0;
                for (const auto& l : lines) totalHeight += l.height;
                if (totalHeight <= contentHeight && cursorY + totalHeight > contentHeight
                    && !currentPage.lines.empty()) {
                    startNewPage(blockIdx);
                }
            }

            // Place lines on pages with orphan/widow protection
            int totalLines = static_cast<int>(lines.size());
            bool orphanChecked = false;  // Guard: only apply orphan correction once per block
            bool widowChecked = false;
            for (int lineIdx = 0; lineIdx < totalLines; ++lineIdx) {
                auto& line = lines[lineIdx];
                float lineHeight = line.height;

                // Check if line fits on current page
                if (cursorY + lineHeight > contentHeight && !currentPage.lines.empty()) {
                    // Orphan check: ensure at least 'orphans' lines stayed on prev page
                    if (!orphanChecked && lineIdx > 0 && lineIdx < bstyle.orphans
                        && totalLines > bstyle.orphans) {
                        orphanChecked = true;
                        // Too few lines on this page — move all to new page
                        for (int r = 0; r < lineIdx; ++r) {
                            if (!currentPage.lines.empty()) {
                                cursorY -= currentPage.lines.back().height;
                                currentPage.lines.pop_back();
                            }
                        }
                        startNewPage(blockIdx);
                        lineIdx = -1;  // will be incremented to 0
                        continue;
                    }

                    // Widow check: ensure at least 'widows' lines go to new page
                    int linesRemaining = totalLines - lineIdx;
                    if (!widowChecked && linesRemaining > 0 && linesRemaining < bstyle.widows
                        && lineIdx >= bstyle.widows && totalLines > bstyle.widows) {
                        widowChecked = true;
                        int linesToMove = bstyle.widows - linesRemaining;
                        for (int r = 0; r < linesToMove; ++r) {
                            if (!currentPage.lines.empty()) {
                                cursorY -= currentPage.lines.back().height;
                                currentPage.lines.pop_back();
                                lineIdx--;
                            }
                        }
                        startNewPage(blockIdx);
                        lineIdx--;  // compensate for ++lineIdx
                        continue;   // re-process from first popped line
                    }

                    startNewPage(blockIdx);
                }

                // Position the line
                line.y = contentY + cursorY + line.ascent;
                line.x = contentX + blockOffsetX;

                // Apply text alignment
                applyAlignment(line, bstyle.alignment, availableWidth);

                // Shift all runs by block offset (margins)
                for (auto& run : line.runs) {
                    run.x += contentX + blockOffsetX;
                    run.y = line.y;
                    // Superscript: shift baseline up by 30% of ascent
                    if (run.isSuperscript) {
                        run.y -= line.ascent * 0.3f;
                    }
                    // Subscript: shift baseline down by 20% of ascent
                    if (run.isSubscript) {
                        run.y += line.ascent * 0.2f;
                    }
                }

                currentPage.lines.push_back(line);
                cursorY += lineHeight;
            }

            // Spacing after block
            float spacingAfter = std::max(bstyle.marginBottom, bstyle.paragraphSpacingAfter);
            cursorY += spacingAfter;

            // break-after: page — force a new page after this block
            if (bstyle.breakAfterPage && (!currentPage.lines.empty() || !currentPage.decorations.empty())) {
                startNewPage(blockIdx + 1);
            }
        }

        // Add the last page if it has content
        if (!currentPage.lines.empty() || !currentPage.decorations.empty()) {
            currentPage.lastBlockIndex = static_cast<int>(chapter.blocks.size()) - 1;
            result.pages.push_back(currentPage);
        }

        // Post-process: vertical centering for pages where all blocks have verticalCenter
        for (auto& page : result.pages) {
            if (page.lines.empty() && page.decorations.empty()) continue;

            // Check if all blocks on this page have verticalCenter
            bool allVerticalCenter = true;
            for (int bi = page.firstBlockIndex; bi <= page.lastBlockIndex; ++bi) {
                if (bi >= 0 && bi < static_cast<int>(resolved.blockStyles.size())) {
                    if (!resolved.blockStyles[bi].verticalCenter) {
                        allVerticalCenter = false;
                        break;
                    }
                }
            }
            if (!allVerticalCenter) continue;

            // Find the bottom-most content position (relative to contentY)
            float maxBottom = 0;
            for (const auto& line : page.lines) {
                float bottom = (line.y + line.descent) - contentY;
                if (bottom > maxBottom) maxBottom = bottom;
            }
            for (const auto& deco : page.decorations) {
                float bottom = (deco.y + deco.height) - contentY;
                if (bottom > maxBottom) maxBottom = bottom;
            }

            float offset = (contentHeight - maxBottom) / 2.0f;
            if (offset > 1.0f) {  // Only shift if meaningful (> 1px)
                TS_LOGD("layout: verticalCenter page=%d offset=%.1f usedH=%.1f contentH=%.1f",
                        page.pageIndex, offset, maxBottom, contentHeight);
                for (auto& line : page.lines) {
                    line.y += offset;
                    for (auto& run : line.runs) {
                        run.y += offset;
                    }
                }
                for (auto& deco : page.decorations) {
                    deco.y += offset;
                }
            }
        }

        // Log per-page block ranges and first text for debugging
        for (size_t pi = 0; pi < result.pages.size(); ++pi) {
            const auto& pg = result.pages[pi];
            std::string firstText;
            for (const auto& line : pg.lines) {
                for (const auto& run : line.runs) {
                    if (!run.text.empty() && run.inlineIndex >= 0) {
                        firstText = run.text;
                        break;
                    }
                }
                if (!firstText.empty()) break;
            }
            if (firstText.size() > 80) firstText = firstText.substr(0, 80) + "...";
            TS_LOGD("layout: page[%zu] blockRange=[%d..%d] lines=%zu decos=%zu firstText='%s'",
                    pi, pg.firstBlockIndex, pg.lastBlockIndex,
                    pg.lines.size(), pg.decorations.size(), firstText.c_str());
        }

        // Detect layout overflow: if page count is unreasonably high relative to content
        if (result.totalBlocks > 0 && static_cast<int>(result.pages.size()) > result.totalBlocks * 50) {
            TS_LOGW("layout: overflow detected pages=%zu blocks=%d ratio=%d",
                    result.pages.size(), result.totalBlocks,
                    static_cast<int>(result.pages.size()) / result.totalBlocks);
            result.warnings.push_back(LayoutWarning::LayoutOverflow);
        }

        TS_LOGI("layoutChapter: pages=%zu blocks=%d", result.pages.size(), result.totalBlocks);
        return result;
    }

    // ---------------------------------------------------------------
    // Multi-font inline line layout
    // ---------------------------------------------------------------
    std::vector<Line> layoutBlockLines(const Block& block,
                                        const BlockComputedStyle& bstyle,
                                        const std::vector<InlineComputedStyle>& inlineStyles,
                                        float availableWidth,
                                        int blockIndex) {
        std::vector<Line> lines;

        if (block.inlines.empty()) return lines;

        float lineHeight = bstyle.font.size * bstyle.lineSpacingMultiplier;
        FontMetrics baseMetrics = platform_->resolveFontMetrics(bstyle.font);
        float maxAscent = baseMetrics.ascent;
        float maxDescent = baseMetrics.descent;

        // List bullet/number marker
        float markerWidth = 0;
        std::string markerText;
        if (block.type == BlockType::ListItem && !bstyle.listStyleNone) {
            if (block.listIndex < 0) {
                // Unordered list: bullet
                markerText = "\xe2\x80\xa2 ";  // "• "
            } else {
                // Ordered list: number
                markerText = std::to_string(block.listIndex + 1) + ". ";
            }
            auto markerMeasure = platform_->measureText(markerText, bstyle.font);
            markerWidth = markerMeasure.width;
        }

        // Line building state
        Line currentLine;
        float lineX = 0;
        bool isFirstLine = true;

        // Apply text indent on first line
        float effectiveWidth = availableWidth;
        if (isFirstLine && bstyle.textIndent != 0) {
            lineX = bstyle.textIndent;
            effectiveWidth = availableWidth - bstyle.textIndent;
        }

        // For list items, place the marker on the first line and indent subsequent text
        if (block.type == BlockType::ListItem && markerWidth > 0) {
            TextRun markerRun;
            markerRun.text = markerText;
            markerRun.font = bstyle.font;
            markerRun.x = lineX;
            markerRun.width = markerWidth;
            markerRun.blockIndex = blockIndex;
            markerRun.inlineIndex = -1;
            markerRun.charOffset = 0;
            markerRun.charLength = static_cast<int>(markerText.size());
            currentLine.runs.push_back(markerRun);
            lineX += markerWidth;
        }

        auto completeLine = [&](bool isLastOfParagraph) {
            currentLine.isLastLineOfParagraph = isLastOfParagraph;
            currentLine.width = lineX;
            currentLine.height = lineHeight;
            currentLine.ascent = maxAscent;
            currentLine.descent = maxDescent;
            lines.push_back(std::move(currentLine));
            currentLine = Line{};
            isFirstLine = false;
            // For list items, subsequent lines indent to align with text after marker
            if (block.type == BlockType::ListItem && markerWidth > 0) {
                lineX = markerWidth;
                effectiveWidth = availableWidth - markerWidth;
            } else {
                lineX = 0;
                effectiveWidth = availableWidth;
            }
            // Reset per-line max metrics
            maxAscent = baseMetrics.ascent;
            maxDescent = baseMetrics.descent;
        };

        for (int inIdx = 0; inIdx < static_cast<int>(block.inlines.size()); ++inIdx) {
            const auto& inl = block.inlines[inIdx];

            // Determine font for this inline element
            FontDescriptor inlineFont = bstyle.font;
            bool runSmallCaps = bstyle.smallCaps;
            bool runIsLink = false;
            bool runIsSuperscript = false;
            bool runIsSubscript = false;
            std::string runHref;

            switch (inl.type) {
                case InlineType::Text:
                    break;
                case InlineType::Bold:
                    inlineFont.weight = FontWeight::Bold;
                    break;
                case InlineType::Italic:
                    inlineFont.style = FontStyle::Italic;
                    break;
                case InlineType::BoldItalic:
                    inlineFont.weight = FontWeight::Bold;
                    inlineFont.style = FontStyle::Italic;
                    break;
                case InlineType::Code:
                    inlineFont.family = "monospace";
                    inlineFont.size = bstyle.font.size * 0.9f;
                    break;
                case InlineType::Link:
                    runIsLink = true;
                    runHref = inl.href;
                    break;
            }

            // Footnote reference: use smaller font and superscript positioning
            if (inl.isFootnoteRef) {
                inlineFont.size = bstyle.font.size * 0.7f;
                runIsSuperscript = true;
            }

            // CSS overrides from InlineComputedStyle
            if (inIdx < static_cast<int>(inlineStyles.size())) {
                const auto& istyle = inlineStyles[inIdx];
                if (istyle.fontSizeMultiplier) {
                    inlineFont.size = bstyle.font.size * *istyle.fontSizeMultiplier;
                }
                if (istyle.fontStyle) {
                    inlineFont.style = *istyle.fontStyle;
                }
                if (istyle.fontWeight) {
                    inlineFont.weight = *istyle.fontWeight;
                }
                if (istyle.smallCaps.has_value()) {
                    runSmallCaps = *istyle.smallCaps;
                }
                if (istyle.isSuperscript) {
                    runIsSuperscript = true;
                    if (!istyle.fontSizeMultiplier) {
                        inlineFont.size = bstyle.font.size * 0.7f;
                    }
                }
                if (istyle.isSubscript) {
                    runIsSubscript = true;
                    if (!istyle.fontSizeMultiplier) {
                        inlineFont.size = bstyle.font.size * 0.7f;
                    }
                }
            }

            // Get metrics for this inline's font
            FontMetrics inlineMetrics = platform_->resolveFontMetrics(inlineFont);
            if (inlineMetrics.ascent > maxAscent) maxAscent = inlineMetrics.ascent;
            if (inlineMetrics.descent > maxDescent) maxDescent = inlineMetrics.descent;

            // Apply text-transform
            TextTransform effectiveTransform = bstyle.textTransform;
            if (inIdx < static_cast<int>(inlineStyles.size()) &&
                inlineStyles[inIdx].textTransform.has_value()) {
                effectiveTransform = *inlineStyles[inIdx].textTransform;
            }

            // Note: italic → non-italic spacing is handled by the renderer
            // (CoreText manages font transitions within a single CTLine)

            // Process the text, breaking into lines as needed
            std::string remaining = applyTextTransform(inl.text, effectiveTransform);
            int charOffset = 0;

            while (!remaining.empty()) {
                // Handle forced line break (\n from <br/> tags)
                size_t nlPos = remaining.find('\n');
                if (nlPos != std::string::npos) {
                    std::string before = remaining.substr(0, nlPos);
                    if (!before.empty()) {
                        auto m = platform_->measureText(before, inlineFont);
                        TextRun run;
                        run.text = before;
                        run.font = inlineFont;
                        run.x = lineX;
                        run.width = m.width;
                        run.blockIndex = blockIndex;
                        run.inlineIndex = inIdx;
                        run.charOffset = charOffset;
                        run.charLength = static_cast<int>(before.size());
                        run.smallCaps = runSmallCaps;
                        run.isLink = runIsLink;
                        run.href = runHref;
                        run.isSuperscript = runIsSuperscript;
                        run.isSubscript = runIsSubscript;
                        currentLine.runs.push_back(run);
                        lineX += m.width;
                    }
                    charOffset += static_cast<int>(nlPos) + 1;
                    remaining = remaining.substr(nlPos + 1);
                    // Forced <br/> breaks are never justified (like last line of paragraph)
                    completeLine(true);
                    lineHeight = baseMetrics.ascent + baseMetrics.descent;
                    continue;
                }

                // Skip leading spaces at the beginning of a line
                if (lineX == 0 || (isFirstLine && lineX == bstyle.textIndent && currentLine.runs.empty())) {
                    size_t firstNonSpace = remaining.find_first_not_of(' ');
                    if (firstNonSpace == std::string::npos) {
                        // Entire remaining is spaces — skip
                        charOffset += static_cast<int>(remaining.size());
                        remaining.clear();
                        break;
                    }
                    if (firstNonSpace > 0) {
                        charOffset += static_cast<int>(firstNonSpace);
                        remaining = remaining.substr(firstNonSpace);
                    }
                }

                float spaceLeft = effectiveWidth - lineX;
                if (isFirstLine && bstyle.textIndent > 0 && currentLine.runs.empty()) {
                    spaceLeft = effectiveWidth - lineX + bstyle.textIndent;
                    // Recalculate: effectiveWidth already accounts for indent
                    spaceLeft = effectiveWidth - (lineX - bstyle.textIndent);
                    // Actually: effectiveWidth = availableWidth - textIndent, lineX starts at textIndent
                    // so spaceLeft = (availableWidth - textIndent) - (lineX - textIndent)
                    //              = availableWidth - lineX
                    // But lineX starts at textIndent. So:
                    // spaceLeft = availableWidth - lineX
                    spaceLeft = availableWidth - lineX;
                }

                // Measure remaining text width
                auto measurement = platform_->measureText(remaining, inlineFont);

                if (measurement.width <= spaceLeft) {
                    // Entire remaining text fits on this line
                    TextRun run;
                    run.text = remaining;
                    run.font = inlineFont;
                    run.x = lineX;
                    run.width = measurement.width;
                    run.blockIndex = blockIndex;
                    run.inlineIndex = inIdx;
                    run.charOffset = charOffset;
                    run.charLength = static_cast<int>(remaining.size());
                    run.smallCaps = runSmallCaps;
                    run.isLink = runIsLink;
                    run.href = runHref;
                    run.isSuperscript = runIsSuperscript;
                    run.isSubscript = runIsSubscript;

                    currentLine.runs.push_back(run);
                    lineX += measurement.width;
                    charOffset += static_cast<int>(remaining.size());
                    remaining.clear();
                } else {
                    // Text doesn't fit — find break point
                    size_t breakPos;
                    bool hyphenBreak = false;

                    // Check for noWrap: treat entire inline as unbreakable
                    bool inlineNoWrap = (inIdx < static_cast<int>(inlineStyles.size()) &&
                                         inlineStyles[inIdx].noWrap);
                    if (inlineNoWrap) {
                        breakPos = 0;  // Force: don't break noWrap text
                    } else {
                        breakPos = platform_->findLineBreak(remaining, inlineFont, spaceLeft);
                    }

                    if (breakPos == 0) {
                        // Nothing fits
                        if (currentLine.runs.empty() && lineX <= bstyle.textIndent + 0.001f) {
                            if (inlineNoWrap) {
                                // NoWrap: force entire text on this line (may overflow)
                                breakPos = remaining.size();
                            } else if (bstyle.hyphens && hyphenationEnabled_ &&
                                       platform_->supportsHyphenation(locale_)) {
                                // Try hyphenation before forcing one character
                                size_t wordEnd = 0;
                                size_t wi = 0;
                                while (wi < remaining.size()) {
                                    unsigned char wc = static_cast<unsigned char>(remaining[wi]);
                                    if (wc == ' ' || wc == '\t') break;
                                    wi += utf8CharLen(wc);
                                    wordEnd = wi;
                                }
                                if (wordEnd > 4) {
                                    std::string word = remaining.substr(0, wordEnd);
                                    auto hyphPoints = platform_->findHyphenationPoints(word, locale_);
                                    auto hyphenMeasure = platform_->measureText("-", inlineFont);
                                    float hyphenWidth = hyphenMeasure.width;
                                    // Try from last to first (prefer longer segments)
                                    for (auto it = hyphPoints.rbegin(); it != hyphPoints.rend(); ++it) {
                                        size_t bytePos = charCountToByteOffset(word, *it);
                                        if (bytePos == 0 || bytePos >= wordEnd) continue;
                                        auto segMeasure = platform_->measureText(
                                            remaining.substr(0, bytePos), inlineFont);
                                        if (segMeasure.width + hyphenWidth <= spaceLeft) {
                                            breakPos = bytePos;
                                            hyphenBreak = true;
                                            break;
                                        }
                                    }
                                }
                            }
                            if (breakPos == 0) {
                                // Force entire first word (don't split words)
                                size_t wi = 0;
                                while (wi < remaining.size()) {
                                    unsigned char wc = static_cast<unsigned char>(remaining[wi]);
                                    if (wc == ' ' || wc == '\t') break;
                                    wi += utf8CharLen(wc);
                                }
                                breakPos = (wi > 0) ? wi : remaining.size();
                            }
                        } else {
                            // Complete current line and start a new one
                            completeLine(false);
                            continue; // Retry on the new line
                        }
                    }

                    std::string segment = remaining.substr(0, breakPos);

                    // Trim trailing spaces from segment
                    std::string trimmedSegment = segment;
                    while (!trimmedSegment.empty() && trimmedSegment.back() == ' ') {
                        trimmedSegment.pop_back();
                    }

                    // For hyphenation breaks, append visible hyphen
                    if (hyphenBreak) {
                        trimmedSegment += "-";
                    }

                    auto segMeasurement = platform_->measureText(trimmedSegment, inlineFont);

                    TextRun run;
                    run.text = trimmedSegment;
                    run.font = inlineFont;
                    run.x = lineX;
                    run.width = segMeasurement.width;
                    run.blockIndex = blockIndex;
                    run.inlineIndex = inIdx;
                    run.charOffset = charOffset;
                    run.charLength = static_cast<int>(trimmedSegment.size());
                    run.smallCaps = runSmallCaps;
                    run.isLink = runIsLink;
                    run.href = runHref;
                    run.isSuperscript = runIsSuperscript;
                    run.isSubscript = runIsSubscript;

                    currentLine.runs.push_back(run);
                    lineX += segMeasurement.width;

                    // Mark line as ending with hyphen
                    if (hyphenBreak) {
                        currentLine.endsWithHyphen = true;
                    }

                    // Complete the current line
                    completeLine(false);

                    charOffset += static_cast<int>(breakPos);
                    remaining = remaining.substr(breakPos);
                }
            }
        }

        // Finish the last line if it has runs
        if (!currentLine.runs.empty()) {
            completeLine(true);
        }

        // Mark the very last line as last-of-paragraph
        if (!lines.empty()) {
            lines.back().isLastLineOfParagraph = true;
        }

        // Hanging punctuation: if enabled, check the first text run of the first line
        // for an opening quote character and shift it into the left margin
        if (bstyle.hangingPunctuation && !lines.empty()) {
            auto& firstLine = lines[0];
            // Find the first run that has actual text content (skip marker runs with inlineIndex == -1)
            for (auto& run : firstLine.runs) {
                if (run.text.empty() || run.inlineIndex < 0) continue;
                // Check first character for opening quotes
                // UTF-8 sequences: \xe2\x80\x9c = left double quote
                //                  \xe2\x80\x9d = right double quote (rare at start)
                //                  \xe2\x80\x98 = left single quote
                //                  \xe2\x80\x99 = right single quote
                //                  \xc2\xab     = left guillemet
                //                  \xe2\x80\x9e = double low-9 quote
                //                  " and '      = ASCII quotes
                std::string firstChar;
                unsigned char lead = static_cast<unsigned char>(run.text[0]);
                if (lead == '"' || lead == '\'') {
                    firstChar = run.text.substr(0, 1);
                } else if (lead == 0xC2 && run.text.size() >= 2) {
                    firstChar = run.text.substr(0, 2);  // guillemet
                } else if (lead == 0xE2 && run.text.size() >= 3) {
                    firstChar = run.text.substr(0, 3);  // unicode quotes
                }
                if (!firstChar.empty()) {
                    bool isOpenQuote = (firstChar == "\"" || firstChar == "'" ||
                                        firstChar == "\xe2\x80\x9c" ||  // left double quote
                                        firstChar == "\xe2\x80\x98" ||  // left single quote
                                        firstChar == "\xc2\xab"     ||  // left guillemet
                                        firstChar == "\xe2\x80\x9e");   // double low-9 quote
                    if (isOpenQuote) {
                        auto charMeasure = platform_->measureText(firstChar, run.font);
                        float hangOffset = charMeasure.width;
                        // Shift this run and all subsequent runs left
                        for (auto& r : firstLine.runs) {
                            r.x -= hangOffset;
                        }
                        firstLine.x -= hangOffset;
                    }
                }
                break;  // Only check the first real text run
            }

            // Right-side hanging: for non-last lines, check if the last run ends
            // with a closing punctuation character and extend it past the right margin
            for (size_t li = 0; li < lines.size(); ++li) {
                auto& line = lines[li];
                if (line.isLastLineOfParagraph) continue;  // Don't hang on ragged last lines
                if (line.runs.empty()) continue;

                auto& lastRun = line.runs.back();
                if (lastRun.text.empty() || lastRun.inlineIndex < 0) continue;

                // Detect trailing punctuation (ASCII + Unicode closing quotes)
                std::string lastChar;
                size_t textLen = lastRun.text.size();
                unsigned char lastByte = static_cast<unsigned char>(lastRun.text[textLen - 1]);
                if (lastByte < 0x80) {
                    // ASCII: period, comma, colon, semicolon, quotes, hyphen
                    char ch = lastRun.text[textLen - 1];
                    if (ch == '.' || ch == ',' || ch == ':' || ch == ';' ||
                        ch == '"' || ch == '\'' || ch == '-') {
                        lastChar = std::string(1, ch);
                    }
                } else if (textLen >= 3) {
                    // UTF-8 3-byte: Unicode closing quotes
                    std::string tail3 = lastRun.text.substr(textLen - 3, 3);
                    if (tail3 == "\xe2\x80\x9d" ||  // right double quote "
                        tail3 == "\xe2\x80\x99" ||  // right single quote '
                        tail3 == "\xe2\x80\x9c" ||  // left double quote " (rare at end)
                        tail3 == "\xe2\x80\x98") {   // left single quote '
                        lastChar = tail3;
                    }
                } else if (textLen >= 2) {
                    // UTF-8 2-byte: right guillemet
                    std::string tail2 = lastRun.text.substr(textLen - 2, 2);
                    if (tail2 == "\xc2\xbb") {  // right guillemet »
                        lastChar = tail2;
                    }
                }

                if (!lastChar.empty()) {
                    auto charMeasure = platform_->measureText(lastChar, lastRun.font);
                    // Extend line width to allow the punctuation to hang past the margin
                    line.width += charMeasure.width;
                }
            }
        }

        return lines;
    }

    // ---------------------------------------------------------------
    // Text alignment
    // ---------------------------------------------------------------
    void applyAlignment(Line& line, TextAlignment alignment, float contentWidth) {
        float extraSpace = contentWidth - line.width;
        if (extraSpace <= 0) return;

        switch (alignment) {
            case TextAlignment::Left:
                break;
            case TextAlignment::Center: {
                float offset = extraSpace / 2.0f;
                line.x += offset;
                for (auto& run : line.runs) {
                    run.x += offset;
                }
                break;
            }
            case TextAlignment::Right:
                line.x += extraSpace;
                for (auto& run : line.runs) {
                    run.x += extraSpace;
                }
                break;
            case TextAlignment::Justified:
                if (!line.isLastLineOfParagraph) {
                    justifyLine(line, contentWidth);
                }
                break;
        }
    }

    // ---------------------------------------------------------------
    // Justification
    // ---------------------------------------------------------------
    void justifyLine(Line& line, float contentWidth) {
        if (line.runs.empty()) return;

        // Count total spaces across all runs
        int spaceCount = 0;
        for (const auto& run : line.runs) {
            for (char c : run.text) {
                if (c == ' ') ++spaceCount;
            }
        }
        if (spaceCount == 0) return;

        float extraSpace = contentWidth - line.width;
        if (extraSpace <= 0) return;
        float extraPerSpace = extraSpace / static_cast<float>(spaceCount);

        // Cap: if extra per space exceeds 1.5x normal space width,
        // fall back to left-aligned (skip justification) to avoid ugly gaps
        for (const auto& run : line.runs) {
            if (!run.text.empty()) {
                float normalSpaceWidth = platform_->measureText(" ", run.font).width;
                if (extraPerSpace > normalSpaceWidth * 1.5f) {
                    return;  // leave line left-aligned
                }
                break;
            }
        }

        // Redistribute: walk through runs, adding extra width per space
        float xCursor = line.runs[0].x;
        for (auto& run : line.runs) {
            run.x = xCursor;
            int spacesInRun = 0;
            for (char c : run.text) {
                if (c == ' ') ++spacesInRun;
            }
            run.wordSpacing = extraPerSpace;
            run.width += spacesInRun * extraPerSpace;
            xCursor += run.width;
        }
        // Set line.width to actual text span (not full contentWidth).
        // For indented lines, firstRun.x includes textIndent, so the span
        // is contentWidth - textIndent. This ensures firstRun.x + line.width
        // equals the correct right edge after absolute positioning.
        line.width = xCursor - line.runs[0].x;
    }
};

LayoutEngine::LayoutEngine(std::shared_ptr<PlatformAdapter> platform)
    : impl_(std::make_unique<Impl>(std::move(platform))) {}

LayoutEngine::~LayoutEngine() = default;

LayoutResult LayoutEngine::layoutChapter(const Chapter& chapter,
                                          const Style& style,
                                          const PageSize& pageSize) {
    return impl_->layoutChapter(chapter, style, pageSize);
}

LayoutResult LayoutEngine::layoutChapter(const Chapter& chapter,
                                          const std::vector<BlockComputedStyle>& styles,
                                          const Style& pageStyle,
                                          const PageSize& pageSize) {
    return impl_->layoutChapter(chapter, styles, pageStyle, pageSize);
}

LayoutResult LayoutEngine::layoutChapter(const Chapter& chapter,
                                          const std::vector<BlockComputedStyle>& styles,
                                          const PageSize& pageSize) {
    return impl_->layoutChapter(chapter, styles, Style{}, pageSize);
}

std::vector<Line> LayoutEngine::layoutBlock(const Block& block,
                                             const Style& style,
                                             float availableWidth) {
    return impl_->layoutBlock(block, style, availableWidth);
}

} // namespace typesetting
