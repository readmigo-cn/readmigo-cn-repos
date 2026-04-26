#include "typesetting/style_resolver.h"
#include "typesetting/log.h"
#include <algorithm>
#include <cctype>
#include <sstream>

namespace typesetting {

namespace {

/// Case-insensitive string comparison
bool iequals(const std::string& a, const std::string& b) {
    if (a.size() != b.size()) return false;
    for (size_t i = 0; i < a.size(); ++i) {
        if (std::tolower(static_cast<unsigned char>(a[i])) !=
            std::tolower(static_cast<unsigned char>(b[i]))) {
            return false;
        }
    }
    return true;
}

/// Check if needle is found within a space-separated list of values in haystack
bool containsClass(const std::string& haystack, const std::string& needle) {
    if (haystack.empty() || needle.empty()) return false;
    std::istringstream iss(haystack);
    std::string token;
    while (iss >> token) {
        if (token == needle) return true;
    }
    return false;
}

/// Map BlockType to its expected HTML tag name
std::string blockTypeToTag(BlockType type) {
    switch (type) {
        case BlockType::Paragraph:     return "p";
        case BlockType::Heading1:      return "h1";
        case BlockType::Heading2:      return "h2";
        case BlockType::Heading3:      return "h3";
        case BlockType::Heading4:      return "h4";
        case BlockType::Heading5:      return "h5";
        case BlockType::Heading6:      return "h6";
        case BlockType::Blockquote:    return "blockquote";
        case BlockType::CodeBlock:     return "pre";
        case BlockType::Image:         return "img";
        case BlockType::HorizontalRule:return "hr";
        case BlockType::ListItem:      return "li";
        case BlockType::Figcaption:    return "figcaption";
        case BlockType::Table:         return "table";
    }
    return "";
}

/// Check if a BlockType is a heading
bool isHeadingType(BlockType type) {
    return type == BlockType::Heading1 || type == BlockType::Heading2 ||
           type == BlockType::Heading3 || type == BlockType::Heading4 ||
           type == BlockType::Heading5 || type == BlockType::Heading6;
}

/// Check if a parent selector matches a given ancestor's metadata
bool ancestorMatchesSel(const CSSSelector& sel,
                        const std::string& tag, const std::string& cls,
                        const std::string& epub, const std::string& id) {
    bool match = false;
    if (sel.type == SelectorType::Element) {
        match = true;
        if (!sel.element.empty()) match = iequals(sel.element, tag);
        if (match && !sel.className.empty()) match = containsClass(cls, sel.className);
        if (match && !sel.id.empty()) match = (id == sel.id);
    } else if (sel.type == SelectorType::Class) {
        match = containsClass(cls, sel.className);
    } else if (sel.type == SelectorType::Attribute) {
        match = containsClass(epub, sel.attributeValue);
    } else if (sel.type == SelectorType::Id) {
        match = (id == sel.id);
    } else if (sel.type == SelectorType::Universal) {
        match = true;
    }
    return match;
}

/// Recursively match a parent selector chain against a block's ancestor chain.
/// CSS descendant semantics: ancestor doesn't need to be a direct parent.
bool parentMatchesBlock(const CSSSelector& parentSel, const Block& block, size_t startIdx) {
    if (!block.ancestors.empty()) {
        for (size_t i = startIdx; i < block.ancestors.size(); i++) {
            const auto& anc = block.ancestors[i];
            if (ancestorMatchesSel(parentSel, anc.tag, anc.className, anc.epubType, anc.id)) {
                if (!parentSel.parent) return true;
                return parentMatchesBlock(*parentSel.parent, block, i + 1);
            }
        }
        return false;
    }
    // Fallback: use parent* fields (direct parent only, for manually constructed blocks in tests)
    if (startIdx > 0) return false;
    bool match = ancestorMatchesSel(parentSel, block.parentTag, block.parentClassName,
                                    block.parentEpubType, block.parentId);
    if (match && parentSel.parent) return false;
    return match;
}

/// Check if a CSS selector targets an ancestor container element.
/// Used for CSS inheritance: properties set on a container (section, div, etc.)
/// should be inherited by child blocks for inheritable properties.
bool selectorMatchesAnyAncestor(const CSSSelector& sel,
                                 const std::vector<AncestorInfo>& ancestors) {
    auto checkLeaf = [&](const std::string& element, const std::string& className,
                         const std::string& id) -> bool {
        for (const auto& anc : ancestors) {
            bool match = true;
            if (!element.empty()) match = iequals(element, anc.tag);
            if (match && !className.empty()) match = containsClass(anc.className, className);
            if (match && !id.empty()) match = (anc.id == id);
            if (match) return true;
        }
        return false;
    };

    switch (sel.type) {
        case SelectorType::Element:
            return checkLeaf(sel.element, sel.className, sel.id);
        case SelectorType::Class:
            return checkLeaf("", sel.className, "");
        case SelectorType::Attribute:
            for (const auto& anc : ancestors) {
                if (containsClass(anc.epubType, sel.attributeValue)) return true;
            }
            return false;
        case SelectorType::Id:
            return checkLeaf("", "", sel.id);
        case SelectorType::Descendant:
            // Leaf element/class should match an ancestor
            return checkLeaf(sel.element, sel.className, sel.id);
        default:
            return false;
    }
}

} // anonymous namespace

StyleResolver::StyleResolver(const CSSStylesheet& stylesheet)
    : stylesheet_(stylesheet) {}

void StyleResolver::applyInheritableProperties(
    const CSSProperties& props, BlockComputedStyle& style,
    float baseFontSize, bool importantOnly) const {

    auto shouldApply = [&](uint32_t flag) -> bool {
        bool isImp = (props.importantFlags & flag) != 0;
        return isImp == importantOnly;
    };

    // Only inheritable CSS properties (NOT margin, padding, width, display, break-*)
    if (props.textAlign.has_value() && shouldApply(kImpTextAlign)) {
        style.alignment = props.textAlign.value();
    }
    if (props.fontStyle.has_value() && shouldApply(kImpFontStyle)) {
        style.font.style = props.fontStyle.value();
    }
    if (props.fontWeight.has_value() && shouldApply(kImpFontWeight)) {
        style.font.weight = props.fontWeight.value();
    }
    if (props.fontSize.has_value() && shouldApply(kImpFontSize)) {
        style.font.size = props.fontSize.value() * baseFontSize;
    }
    if (props.fontVariant.has_value() && shouldApply(kImpFontVariant)) {
        style.smallCaps = (props.fontVariant.value() == FontVariant::SmallCaps);
    }
    if (props.lineHeight.has_value() && shouldApply(kImpLineHeight)) {
        float val = props.lineHeight.value();
        if (val < 0) {
            style.lineSpacingMultiplier = (-val) / style.font.size;
        } else {
            style.lineSpacingMultiplier = val;
        }
    }
    if (props.textIndent.has_value() && shouldApply(kImpTextIndent)) {
        style.textIndent = props.textIndent.value() * baseFontSize;
    }
    if (props.textTransform.has_value() && shouldApply(kImpTextTransform)) {
        style.textTransform = props.textTransform.value();
    }
    if (props.hyphens.has_value() && shouldApply(kImpHyphens)) {
        style.hyphens = props.hyphens.value();
    }
    if (props.hangingPunctuation.has_value() && shouldApply(kImpHangingPunct)) {
        style.hangingPunctuation = props.hangingPunctuation.value();
    }
}

ResolvedStyles StyleResolver::resolve(
    const std::vector<Block>& blocks,
    const Style& userStyle) const {

    ResolvedStyles result;
    result.blockStyles.reserve(blocks.size());
    result.inlineStyles.reserve(blocks.size());

    for (const auto& block : blocks) {
        // === Block resolution ===
        BlockComputedStyle style = defaultStyleForBlock(block, userStyle);
        float baseFontSize = userStyle.font.size;

        // Phase 0: CSS inheritance — apply inheritable properties from
        // rules that target ancestor containers (section, div, header, etc.)
        if (!block.ancestors.empty()) {
            std::vector<const CSSRule*> inheritedMatches;
            for (const auto& rule : stylesheet_.rules) {
                if (selectorMatchesAnyAncestor(rule.selector, block.ancestors)) {
                    inheritedMatches.push_back(&rule);
                }
            }
            std::stable_sort(inheritedMatches.begin(), inheritedMatches.end(),
                      [](const CSSRule* a, const CSSRule* b) {
                          return a->selector.specificity() < b->selector.specificity();
                      });
            for (const auto* rule : inheritedMatches) {
                applyInheritableProperties(rule->properties, style, baseFontSize, false);
            }
            for (const auto* rule : inheritedMatches) {
                applyInheritableProperties(rule->properties, style, baseFontSize, true);
            }
            // Propagate vertical centering from ancestor flex containers
            for (const auto* rule : inheritedMatches) {
                if (rule->properties.verticalCenter.value_or(false)) {
                    style.verticalCenter = true;
                }
            }
        }

        // Phase 1: direct CSS rules matching this block (override inheritance)
        std::vector<const CSSRule*> matches;
        for (const auto& rule : stylesheet_.rules) {
            if (selectorMatches(rule.selector, block)) {
                matches.push_back(&rule);
            }
        }
        std::stable_sort(matches.begin(), matches.end(),
                  [](const CSSRule* a, const CSSRule* b) {
                      return a->selector.specificity() < b->selector.specificity();
                  });

        bool cssFontSizeSet = false;
        bool cssLineHeightSet = false;
        bool cssTextAlignSet = false;
        bool cssFontFamilySet = false;
        for (const auto* rule : matches) {
            if (rule->properties.fontSize.has_value()) cssFontSizeSet = true;
            if (rule->properties.lineHeight.has_value()) cssLineHeightSet = true;
            if (rule->properties.textAlign.has_value()) cssTextAlignSet = true;
            if (rule->properties.fontFamily.has_value()) cssFontFamilySet = true;
        }
        // Also check inherited rules for the tracking flags
        if (!block.ancestors.empty()) {
            for (const auto& rule : stylesheet_.rules) {
                if (selectorMatchesAnyAncestor(rule.selector, block.ancestors)) {
                    if (rule.properties.textAlign.has_value()) cssTextAlignSet = true;
                }
            }
        }
        // Pass 1: apply non-important properties
        for (const auto* rule : matches) {
            applyProperties(rule->properties, style, baseFontSize, false);
        }
        // Pass 2: apply !important properties (override regardless of specificity)
        for (const auto* rule : matches) {
            applyProperties(rule->properties, style, baseFontSize, true);
        }

        applyUserOverrides(style, userStyle, block, cssFontSizeSet, cssLineHeightSet, cssTextAlignSet, cssFontFamilySet);
        result.blockStyles.push_back(std::move(style));

        // === Inline resolution ===
        std::vector<InlineComputedStyle> inlineStyles;
        inlineStyles.reserve(block.inlines.size());
        for (const auto& inl : block.inlines) {
            InlineComputedStyle istyle;
            std::vector<const CSSRule*> inlineMatches;
            for (const auto& rule : stylesheet_.rules) {
                if (inlineSelectorMatches(rule.selector, inl, block)) {
                    inlineMatches.push_back(&rule);
                }
            }
            std::stable_sort(inlineMatches.begin(), inlineMatches.end(),
                      [](const CSSRule* a, const CSSRule* b) {
                          return a->selector.specificity() < b->selector.specificity();
                      });
            // Pass 1: non-important
            for (const auto* rule : inlineMatches) {
                applyInlineProperties(rule->properties, istyle, false);
            }
            // Pass 2: important
            for (const auto* rule : inlineMatches) {
                applyInlineProperties(rule->properties, istyle, true);
            }
            inlineStyles.push_back(std::move(istyle));
        }
        result.inlineStyles.push_back(std::move(inlineStyles));
    }

    // Phase 5: Expand display:block inline spans into separate blocks
    bool needsExpansion = false;
    for (size_t bi = 0; bi < blocks.size() && !needsExpansion; ++bi) {
        for (size_t ii = 0; ii < result.inlineStyles[bi].size(); ++ii) {
            if (result.inlineStyles[bi][ii].displayBlock) {
                needsExpansion = true;
                break;
            }
        }
    }

    if (needsExpansion) {
        std::vector<Block> expandedBlocks;
        std::vector<BlockComputedStyle> expandedStyles;
        std::vector<std::vector<InlineComputedStyle>> expandedInlineStyles;

        for (size_t bi = 0; bi < blocks.size(); ++bi) {
            const auto& block = blocks[bi];
            const auto& blockStyle = result.blockStyles[bi];
            const auto& inlStyles = result.inlineStyles[bi];

            // Check if this block has any display:block inlines
            bool hasDisplayBlock = false;
            for (size_t ii = 0; ii < inlStyles.size(); ++ii) {
                if (inlStyles[ii].displayBlock) {
                    hasDisplayBlock = true;
                    break;
                }
            }

            if (!hasDisplayBlock) {
                expandedBlocks.push_back(block);
                expandedStyles.push_back(blockStyle);
                expandedInlineStyles.push_back(inlStyles);
                continue;
            }

            // Split this block at display:block span boundaries
            std::vector<InlineElement> pendingInlines;
            std::vector<InlineComputedStyle> pendingInlStyles;

            for (size_t ii = 0; ii < block.inlines.size(); ++ii) {
                const auto& inl = block.inlines[ii];
                bool isDisplayBlock = (ii < inlStyles.size() && inlStyles[ii].displayBlock);

                if (isDisplayBlock) {
                    // Flush any pending non-display:block inlines as a regular block
                    if (!pendingInlines.empty()) {
                        Block subBlock;
                        subBlock.type = block.type;
                        subBlock.htmlTag = block.htmlTag;
                        subBlock.className = block.className;
                        subBlock.epubType = block.epubType;
                        subBlock.parentTag = block.parentTag;
                        subBlock.parentClassName = block.parentClassName;
                        subBlock.parentEpubType = block.parentEpubType;
                        subBlock.parentId = block.parentId;
                        subBlock.id = block.id;
                        subBlock.inlines = std::move(pendingInlines);
                        pendingInlines.clear();

                        expandedBlocks.push_back(std::move(subBlock));
                        expandedStyles.push_back(blockStyle);
                        expandedInlineStyles.push_back(std::move(pendingInlStyles));
                        pendingInlStyles.clear();
                    }

                    // Create a new block for this display:block span
                    Block spanBlock;
                    spanBlock.type = BlockType::Paragraph;
                    spanBlock.htmlTag = inl.htmlTag.empty() ? "span" : inl.htmlTag;
                    spanBlock.className = inl.className;
                    spanBlock.epubType = inl.epubType;
                    spanBlock.parentTag = block.htmlTag;
                    spanBlock.parentClassName = block.className;
                    spanBlock.parentEpubType = block.epubType;
                    spanBlock.parentId = block.id;

                    InlineElement newInl = inl;
                    spanBlock.inlines.push_back(newInl);

                    // Style: start from parent block style, then apply CSS overrides
                    BlockComputedStyle spanStyle = blockStyle;
                    spanStyle.textIndent = 0;
                    spanStyle.paragraphSpacingAfter = 0;
                    spanStyle.marginTop = 0;
                    spanStyle.marginBottom = 0;

                    // Re-match CSS rules targeting this inline and apply as block properties
                    float baseFontSize = userStyle.font.size;
                    std::vector<const CSSRule*> spanMatches;
                    for (const auto& rule : stylesheet_.rules) {
                        if (inlineSelectorMatches(rule.selector, inl, block)) {
                            spanMatches.push_back(&rule);
                        }
                    }
                    std::stable_sort(spanMatches.begin(), spanMatches.end(),
                              [](const CSSRule* a, const CSSRule* b) {
                                  return a->selector.specificity() < b->selector.specificity();
                              });
                    for (const auto* rule : spanMatches) {
                        applyProperties(rule->properties, spanStyle, baseFontSize, false);
                    }
                    for (const auto* rule : spanMatches) {
                        applyProperties(rule->properties, spanStyle, baseFontSize, true);
                    }

                    expandedBlocks.push_back(std::move(spanBlock));
                    expandedStyles.push_back(std::move(spanStyle));
                    expandedInlineStyles.push_back({});

                } else if (inl.text == "\n") {
                    // Skip <br/> between display:block spans
                    continue;
                } else {
                    pendingInlines.push_back(inl);
                    if (ii < inlStyles.size()) {
                        pendingInlStyles.push_back(inlStyles[ii]);
                    }
                }
            }

            // Flush remaining non-display:block inlines
            if (!pendingInlines.empty()) {
                Block subBlock;
                subBlock.type = block.type;
                subBlock.htmlTag = block.htmlTag;
                subBlock.className = block.className;
                subBlock.epubType = block.epubType;
                subBlock.parentTag = block.parentTag;
                subBlock.parentClassName = block.parentClassName;
                subBlock.parentEpubType = block.parentEpubType;
                subBlock.parentId = block.parentId;
                subBlock.id = block.id;
                subBlock.inlines = std::move(pendingInlines);

                expandedBlocks.push_back(std::move(subBlock));
                expandedStyles.push_back(blockStyle);
                expandedInlineStyles.push_back(std::move(pendingInlStyles));
            }
        }

        result.expandedBlocks = std::move(expandedBlocks);
        result.blockStyles = std::move(expandedStyles);
        result.inlineStyles = std::move(expandedInlineStyles);
    }

    return result;
}

BlockComputedStyle StyleResolver::defaultStyleForBlock(
    const Block& block, const Style& userStyle) const {

    BlockComputedStyle style;
    float em = userStyle.font.size;

    // Base font from user style
    style.font = userStyle.font;

    // Common defaults from user style
    style.lineSpacingMultiplier = userStyle.lineSpacingMultiplier;
    style.letterSpacing = userStyle.letterSpacing;
    style.wordSpacing = userStyle.wordSpacing;
    style.paragraphSpacingAfter = userStyle.paragraphSpacing;

    switch (block.type) {
        case BlockType::Paragraph:
            style.textIndent = em;  // 1em
            style.alignment = TextAlignment::Justified;
            style.hyphens = true;
            break;

        case BlockType::Heading1:
            style.font.size = em * 1.5f;
            style.smallCaps = true;
            style.alignment = TextAlignment::Center;
            style.hyphens = false;
            style.textIndent = 0;
            style.marginTop = 3.0f * em;
            style.marginBottom = 1.0f * em;
            break;

        case BlockType::Heading2:
            style.font.size = em * 1.3f;
            style.smallCaps = true;
            style.alignment = TextAlignment::Center;
            style.hyphens = false;
            style.textIndent = 0;
            style.marginTop = 3.0f * em;
            style.marginBottom = 1.0f * em;
            break;

        case BlockType::Heading3:
            style.font.size = em * 1.1f;
            style.smallCaps = true;
            style.alignment = TextAlignment::Center;
            style.hyphens = false;
            style.textIndent = 0;
            style.marginTop = 2.0f * em;
            style.marginBottom = 0.5f * em;
            break;

        case BlockType::Heading4:
            style.font.size = em * 1.0f;
            style.smallCaps = true;
            style.alignment = TextAlignment::Center;
            style.hyphens = false;
            style.textIndent = 0;
            style.marginTop = 1.5f * em;
            style.marginBottom = 0.5f * em;
            break;

        case BlockType::Heading5:
            style.font.size = em * 0.83f;
            style.smallCaps = true;
            style.alignment = TextAlignment::Center;
            style.hyphens = false;
            style.textIndent = 0;
            style.marginTop = 1.0f * em;
            style.marginBottom = 0.5f * em;
            break;

        case BlockType::Heading6:
            style.font.size = em * 0.67f;
            style.smallCaps = true;
            style.alignment = TextAlignment::Center;
            style.hyphens = false;
            style.textIndent = 0;
            style.marginTop = 1.0f * em;
            style.marginBottom = 0.5f * em;
            break;

        case BlockType::Blockquote:
            style.marginLeft = 2.5f * em;
            style.marginRight = 2.5f * em;
            style.alignment = TextAlignment::Justified;
            style.hyphens = true;
            break;

        case BlockType::CodeBlock:
            style.font.family = "monospace";
            style.font.size = em * 0.9f;
            style.hyphens = false;
            style.alignment = TextAlignment::Left;
            style.textIndent = 0;
            break;

        case BlockType::HorizontalRule:
            style.hrStyle = HRStyle{};
            style.hidden = false;
            style.textIndent = 0;
            break;

        case BlockType::ListItem:
            style.marginLeft = 2.0f * em;
            style.alignment = TextAlignment::Justified;
            style.hyphens = true;
            break;

        case BlockType::Image:
            style.textIndent = 0;
            break;

        case BlockType::Figcaption:
            style.font.size = em * 0.85f;
            style.font.style = FontStyle::Italic;
            style.alignment = TextAlignment::Center;
            style.textIndent = 0;
            style.marginTop = 0.5f * em;
            style.hyphens = false;
            break;

        case BlockType::Table:
            style.textIndent = 0;
            style.alignment = TextAlignment::Left;
            style.hyphens = false;
            style.marginTop = 1.0f * em;
            style.marginBottom = 1.0f * em;
            break;
    }

    // Built-in default for poem lines generated by the HTML parser.
    // poem-line-iN → left margin = N * em, no first-line indent, no hyphenation.
    // This runs before CSS rules so external CSS can still override if needed.
    static const std::string kPoemLinePrefix = "poem-line-i";
    if (block.className.substr(0, kPoemLinePrefix.size()) == kPoemLinePrefix) {
        try {
            int level = std::stoi(block.className.substr(kPoemLinePrefix.size()));
            style.marginLeft = static_cast<float>(level) * em;
            style.textIndent = 0;
            style.alignment = TextAlignment::Left;
            style.hyphens = false;
            style.paragraphSpacingAfter = 0;  // poem lines are packed tight
        } catch (...) {}
    }

    return style;
}

bool StyleResolver::selectorMatches(const CSSSelector& selector, const Block& block) const {
    // Determine the effective tag for this block
    std::string effectiveTag = block.htmlTag;
    if (effectiveTag.empty()) {
        effectiveTag = blockTypeToTag(block.type);
    }

    switch (selector.type) {
        case SelectorType::Element: {
            bool baseMatch = true;
            if (!selector.element.empty()) baseMatch = iequals(selector.element, effectiveTag);
            if (baseMatch && !selector.className.empty()) {
                baseMatch = containsClass(block.className, selector.className);
            }
            if (baseMatch && !selector.id.empty()) {
                baseMatch = (block.id == selector.id);
            }
            // :not() negation check
            if (baseMatch && selector.negation) {
                if (selectorMatches(*selector.negation, block)) return false;
            }
            return baseMatch;
        }

        case SelectorType::Class:
            return containsClass(block.className, selector.className);

        case SelectorType::Descendant: {
            // The main element/class must match the block
            bool mainMatch = false;
            if (selector.element == "*") {
                mainMatch = true;  // Universal match (explicit)
            } else if (selector.element.empty() && selector.className.empty() && selector.parent) {
                mainMatch = true;  // Universal match (from parseSingleToken "*")
            } else if (!selector.element.empty()) {
                mainMatch = iequals(selector.element, effectiveTag);
            } else if (!selector.className.empty()) {
                mainMatch = containsClass(block.className, selector.className);
            }
            if (!mainMatch) return false;

            // Check className on main element (compound like p.class or *.class in descendant)
            if (!selector.className.empty()) {
                if (!containsClass(block.className, selector.className)) return false;
            }

            // Check pseudo-class on main element
            if (!selector.pseudoClass.empty()) {
                if (selector.pseudoClass == "first-child") {
                    if (!block.previousSiblings.empty()) return false;
                    if (!block.isFirstChild) return false;
                }
                if (selector.pseudoClass == "last-child" && !block.isLastChild) {
                    return false;
                }
            }

            // Parent must match
            if (!selector.parent) return false;
            return parentMatchesBlock(*selector.parent, block, 0);
        }

        case SelectorType::AdjacentSibling: {
            // Main element matches block's tag
            if (selector.element != "*" && !iequals(selector.element, effectiveTag)) return false;
            // Check className on main element
            if (!selector.className.empty() && !containsClass(block.className, selector.className)) return false;
            if (!selector.adjacentSibling) return false;

            // Walk the adjacent sibling chain against previousSiblings
            const CSSSelector* sib = selector.adjacentSibling.get();
            size_t sibIdx = 0;
            while (sib) {
                if (sibIdx >= block.previousSiblings.size()) return false;
                if (sib->element != "*" &&
                    !iequals(sib->element, block.previousSiblings[sibIdx].tag)) return false;
                // Check className on sibling
                if (!sib->className.empty() &&
                    !containsClass(block.previousSiblings[sibIdx].className, sib->className)) return false;
                sib = sib->adjacentSibling.get();
                sibIdx++;
            }

            // Check descendant context (parent) if present
            if (selector.parent) {
                return parentMatchesBlock(*selector.parent, block, 0);
            }
            return true;
        }

        case SelectorType::PseudoFirstChild: {
            // Empty element means any tag matches (e.g., bare :first-child in :not())
            if (!selector.element.empty() && !iequals(selector.element, effectiveTag)) return false;
            if (!selector.className.empty() && !containsClass(block.className, selector.className)) return false;
            if (selector.pseudoClass == "last-child") return block.isLastChild;
            // Defensive: blocks with previous siblings are not first-child
            if (!block.previousSiblings.empty()) return false;
            return block.isFirstChild;
        }

        case SelectorType::Attribute: {
            // Check block's epubType or parentEpubType
            return containsClass(block.epubType, selector.attributeValue) ||
                   containsClass(block.parentEpubType, selector.attributeValue);
        }

        case SelectorType::Universal:
            return true;

        case SelectorType::Id:
            return !selector.id.empty() && block.id == selector.id;
    }

    return false;
}

void StyleResolver::applyProperties(
    const CSSProperties& props, BlockComputedStyle& style, float baseFontSize,
    bool importantOnly) const {

    auto shouldApply = [&](uint32_t flag) -> bool {
        bool isImp = (props.importantFlags & flag) != 0;
        return isImp == importantOnly;
    };

    if (props.textIndent.has_value() && shouldApply(kImpTextIndent)) {
        style.textIndent = props.textIndent.value() * baseFontSize;
    }

    if (props.marginTop.has_value() && shouldApply(kImpMarginTop)) {
        style.marginTop = props.marginTop.value() * baseFontSize;
    }

    if (props.marginBottom.has_value() && shouldApply(kImpMarginBottom)) {
        style.marginBottom = props.marginBottom.value() * baseFontSize;
    }

    if (props.marginLeft.has_value() && shouldApply(kImpMarginLeft)) {
        style.marginLeft = props.marginLeft.value() * baseFontSize;
    }

    if (props.marginRight.has_value() && shouldApply(kImpMarginRight)) {
        style.marginRight = props.marginRight.value() * baseFontSize;
    }

    if (props.textAlign.has_value() && shouldApply(kImpTextAlign)) {
        style.alignment = props.textAlign.value();
    }

    if (props.fontStyle.has_value() && shouldApply(kImpFontStyle)) {
        style.font.style = props.fontStyle.value();
    }

    if (props.fontWeight.has_value() && shouldApply(kImpFontWeight)) {
        style.font.weight = props.fontWeight.value();
    }

    if (props.fontSize.has_value() && shouldApply(kImpFontSize)) {
        style.font.size = props.fontSize.value() * baseFontSize;
    }

    if (props.paddingLeft.has_value() && shouldApply(kImpPaddingLeft)) {
        style.paddingLeft = props.paddingLeft.value() * baseFontSize;
    }

    if (props.paddingRight.has_value() && shouldApply(kImpPaddingRight)) {
        style.paddingRight = props.paddingRight.value() * baseFontSize;
    }

    if (props.fontVariant.has_value() && shouldApply(kImpFontVariant)) {
        if (props.fontVariant.value() == FontVariant::SmallCaps) {
            style.smallCaps = true;
        } else {
            style.smallCaps = false;
        }
    }

    if (props.hyphens.has_value() && shouldApply(kImpHyphens)) {
        style.hyphens = props.hyphens.value();
    }

    if (props.display.has_value() && shouldApply(kImpDisplay)) {
        if (props.display.value() == "none") {
            style.display = BlockComputedStyle::Display::None;
            style.hidden = true;
        } else if (props.display.value() == "inline-block") {
            style.display = BlockComputedStyle::Display::InlineBlock;
        } else if (props.display.value() == "block") {
            style.display = BlockComputedStyle::Display::Block;
        }
    }

    if (props.textTransform.has_value() && shouldApply(kImpTextTransform)) {
        style.textTransform = props.textTransform.value();
    }

    if (props.fontVariantNumeric.has_value() && shouldApply(kImpFontVariantNum)) {
        style.oldstyleNums = props.fontVariantNumeric.value();
    }

    if (props.hangingPunctuation.has_value() && shouldApply(kImpHangingPunct)) {
        style.hangingPunctuation = props.hangingPunctuation.value();
    }

    if (props.lineHeight.has_value() && shouldApply(kImpLineHeight)) {
        float val = props.lineHeight.value();
        if (val < 0) {
            // Negative = px value, convert to multiplier
            style.lineSpacingMultiplier = (-val) / style.font.size;
        } else {
            style.lineSpacingMultiplier = val;
        }
    }

    if (props.widthPercent.has_value() && shouldApply(kImpWidthPercent)) {
        style.widthPercent = props.widthPercent.value();
    }

    if (props.maxWidthPercent.has_value() && shouldApply(kImpMaxWidthPercent)) {
        style.maxWidthPercent = props.maxWidthPercent.value();
    }

    if (props.maxWidthEm.has_value() && shouldApply(kImpMaxWidthPercent)) {
        style.maxWidthPx = props.maxWidthEm.value() * baseFontSize;
    }

    if (props.marginLeftAuto.value_or(false) && props.marginRightAuto.value_or(false)
        && shouldApply(kImpMarginLeftAuto)) {
        style.horizontalCentering = true;
    }

    if (props.widthEm.has_value() && shouldApply(kImpWidthEm)) {
        style.widthPx = props.widthEm.value() * baseFontSize;
    }

    if (props.breakInsideAvoid.has_value() && shouldApply(kImpBreakInside)) {
        style.breakInsideAvoid = props.breakInsideAvoid.value();
    }

    if (props.breakAfterAvoid.has_value() && shouldApply(kImpBreakAfter)) {
        style.breakAfterAvoid = props.breakAfterAvoid.value();
    }

    if (props.orphans.has_value() && shouldApply(kImpOrphans)) {
        style.orphans = props.orphans.value();
    }

    if (props.widows.has_value() && shouldApply(kImpWidows)) {
        style.widows = props.widows.value();
    }

    if (props.breakBeforePage.has_value() && shouldApply(kImpBreakBefore)) {
        style.breakBeforePage = props.breakBeforePage.value();
    }

    if (props.breakAfterPage.has_value() && shouldApply(kImpBreakAfter)) {
        style.breakAfterPage = props.breakAfterPage.value();
    }

    if (props.positionAbsolute.has_value() && shouldApply(kImpPosition)) {
        if (props.positionAbsolute.value()) {
            style.display = BlockComputedStyle::Display::None;
            style.hidden = true;
        }
    }

    // Extended important flags (importantFlags2) for block properties
    auto shouldApply2 = [&](uint32_t flag) -> bool {
        bool isImp = (props.importantFlags2 & flag) != 0;
        return isImp == importantOnly;
    };

    if (props.borderCollapse.has_value() && shouldApply2(kImp2BorderCollapse)) {
        style.borderCollapse = props.borderCollapse.value();
    }

    if (props.borderLeftWidth.has_value() && shouldApply2(kImp2BorderLeftWidth)) {
        style.borderLeftWidth = props.borderLeftWidth.value();
    }

    if (props.listStyleNone.has_value() && shouldApply2(kImp2ListStyle)) {
        style.listStyleNone = props.listStyleNone.value();
    }

    if (props.fontFamily.has_value() && shouldApply2(kImp2FontFamily)) {
        style.font.family = props.fontFamily.value();
    }

    // HR style: construct from border-top-width and width-percent
    bool hrBorder = props.borderTopWidth.has_value() && shouldApply(kImpBorderTopWidth);
    bool hrWidth = props.widthPercent.has_value() && shouldApply(kImpWidthPercent);
    if (hrBorder || hrWidth) {
        if (!style.hrStyle.has_value()) {
            style.hrStyle = HRStyle{};
        }
        if (hrBorder) {
            style.hrStyle->borderWidth = props.borderTopWidth.value();
        }
        if (hrWidth) {
            style.hrStyle->widthPercent = props.widthPercent.value();
        }
    }
}

void StyleResolver::applyUserOverrides(
    BlockComputedStyle& style, const Style& userStyle, const Block& block,
    bool cssFontSizeSet, bool cssLineHeightSet, bool cssTextAlignSet, bool cssFontFamilySet) const {

    // Font family: override unless CSS explicitly set font-family (e.g. monospace)
    if (!cssFontFamilySet) {
        style.font.family = userStyle.font.family;
    }

    // Font size: don't override for headings (they should remain proportionally larger),
    // CodeBlock (should remain proportionally smaller), Figcaption,
    // or any block where CSS explicitly set font-size.
    if (!isHeadingType(block.type) && block.type != BlockType::CodeBlock &&
        block.type != BlockType::Figcaption && !cssFontSizeSet) {
        style.font.size = userStyle.font.size;
    }

    // Spacing: override unless CSS explicitly set line-height
    if (!cssLineHeightSet) {
        style.lineSpacingMultiplier = userStyle.lineSpacingMultiplier;
    }
    style.letterSpacing = userStyle.letterSpacing;
    style.wordSpacing = userStyle.wordSpacing;
    style.paragraphSpacingAfter = userStyle.paragraphSpacing;

    // Alignment: override UNLESS CSS explicitly set text-align,
    // or block is a heading with Center alignment
    if (!cssTextAlignSet &&
        !(isHeadingType(block.type) && style.alignment == TextAlignment::Center)) {
        style.alignment = userStyle.alignment;
    }

    // Hyphenation: override UNLESS CSS explicitly set hyphens=false
    if (style.hyphens) {
        style.hyphens = userStyle.hyphenation;
    }
    // If CSS set hyphens=false, keep it false regardless of user preference
}

bool StyleResolver::inlineSelectorMatches(
    const CSSSelector& selector, const InlineElement& inl, const Block& parentBlock) const {

    // Check if a tag name is an inline tag
    auto isInlineTag = [](const std::string& tag) -> bool {
        return tag == "a" || tag == "abbr" || tag == "span" ||
               tag == "b" || tag == "i" || tag == "em" || tag == "strong" ||
               tag == "cite" || tag == "code" || tag == "small" ||
               tag == "sub" || tag == "sup";
    };

    switch (selector.type) {
        case SelectorType::Element:
            if (inl.htmlTag.empty()) return false;
            if (!isInlineTag(selector.element)) return false;
            if (!selector.className.empty()) {
                return iequals(selector.element, inl.htmlTag) &&
                       containsClass(inl.className, selector.className);
            }
            return iequals(selector.element, inl.htmlTag);

        case SelectorType::Class:
            return containsClass(inl.className, selector.className);

        case SelectorType::Attribute:
            return containsClass(inl.epubType, selector.attributeValue);

        case SelectorType::Descendant: {
            // Leaf must match inline
            bool leafMatch = false;
            if (selector.element == "*") {
                leafMatch = true;
            } else if (!selector.element.empty()) {
                if (inl.htmlTag.empty()) return false;
                if (!isInlineTag(selector.element)) return false;
                leafMatch = iequals(selector.element, inl.htmlTag);
            } else if (!selector.className.empty()) {
                leafMatch = containsClass(inl.className, selector.className);
            }
            if (!leafMatch) return false;

            // Compound: element + className
            if (!selector.element.empty() && selector.element != "*" &&
                !selector.className.empty()) {
                if (!containsClass(inl.className, selector.className)) return false;
            }

            // Parent must match the block
            if (!selector.parent) return false;
            return selectorMatches(*selector.parent, parentBlock);
        }

        case SelectorType::Universal:
            return true;

        default:
            return false;
    }
}

void StyleResolver::applyInlineProperties(
    const CSSProperties& props, InlineComputedStyle& style, bool importantOnly) const {

    auto shouldApply = [&](uint32_t flag) -> bool {
        bool isImp = (props.importantFlags & flag) != 0;
        return isImp == importantOnly;
    };

    if (props.fontSize.has_value() && shouldApply(kImpFontSize)) {
        style.fontSizeMultiplier = props.fontSize.value();
    }
    if (props.fontStyle.has_value() && shouldApply(kImpFontStyle)) {
        style.fontStyle = props.fontStyle.value();
    }
    if (props.fontWeight.has_value() && shouldApply(kImpFontWeight)) {
        style.fontWeight = props.fontWeight.value();
    }
    if (props.fontVariant.has_value() && shouldApply(kImpFontVariant)) {
        if (props.fontVariant.value() == FontVariant::SmallCaps) {
            style.smallCaps = true;
        } else {
            style.smallCaps = false;
        }
    }
    if (props.textTransform.has_value() && shouldApply(kImpTextTransform)) {
        style.textTransform = props.textTransform.value();
    }
    if (props.verticalAlign.has_value() && shouldApply(kImpVerticalAlign)) {
        if (props.verticalAlign.value() == "super") {
            style.isSuperscript = true;
            style.isSubscript = false;
        } else if (props.verticalAlign.value() == "sub") {
            style.isSubscript = true;
            style.isSuperscript = false;
        } else {
            style.isSuperscript = false;
            style.isSubscript = false;
        }
    }
    if (props.whiteSpace.has_value() && shouldApply(kImpWhiteSpace)) {
        style.noWrap = (props.whiteSpace.value() == "nowrap");
    }
    if (props.display.has_value() && shouldApply(kImpDisplay)) {
        if (props.display.value() == "block") {
            style.displayBlock = true;
        }
    }

    auto shouldApply2 = [&](uint32_t flag) -> bool {
        bool isImp = (props.importantFlags2 & flag) != 0;
        return isImp == importantOnly;
    };

    if (props.textDecoration.has_value() && shouldApply2(kImp2TextDecoration)) {
        style.underline = (props.textDecoration.value() == "underline");
    }
}

} // namespace typesetting
