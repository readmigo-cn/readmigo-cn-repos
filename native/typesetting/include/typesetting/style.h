#pragma once

#include "typesetting/platform.h"
#include <cstdint>
#include <optional>

namespace typesetting {

/// Text alignment options
enum class TextAlignment {
    Left,
    Center,
    Right,
    Justified,
};

/// Complete set of typesetting style parameters.
/// Maps to the reader settings in iOS (ThemeManager) and Android.
struct Style {
    // Font
    FontDescriptor font;

    // Spacing
    float lineSpacingMultiplier = 1.4f;   // CSS line-height equivalent
    float letterSpacing = 0;               // Extra space between characters (px)
    float wordSpacing = 0;                 // Extra space between words (px)
    float paragraphSpacing = 12.0f;        // Space between paragraphs (px)

    // Alignment & hyphenation
    TextAlignment alignment = TextAlignment::Justified;
    bool hyphenation = true;
    std::string locale = "en";

    // Indentation
    float textIndent = 0;                  // First-line indent (px)

    // Page margins
    float marginTop = 80.0f;
    float marginBottom = 52.0f;
    float marginLeft = 48.0f;
    float marginRight = 64.0f;

    /// Computed line height based on font size and multiplier
    float lineHeight() const {
        return font.size * lineSpacingMultiplier;
    }

    /// Available content width given a page width
    float contentWidth(float pageWidth) const {
        return pageWidth - marginLeft - marginRight;
    }

    /// Available content height given a page height
    float contentHeight(float pageHeight) const {
        return pageHeight - marginTop - marginBottom;
    }
};

/// Text transformation modes
enum class TextTransform {
    None,
    Uppercase,
    Lowercase,
    Capitalize,
};

/// Horizontal rule visual properties
struct HRStyle {
    float borderWidth = 1.0f;
    float widthPercent = 25.0f;
    float marginTopEm = 1.5f;
    float marginBottomEm = 1.5f;
};

/// Computed style for a single block, combining CSS rules + user Style
struct BlockComputedStyle {
    FontDescriptor font;

    // Text layout
    float textIndent = 0;
    TextAlignment alignment = TextAlignment::Justified;
    bool hyphens = true;
    bool smallCaps = false;
    enum class Display { Block, None, InlineBlock };
    Display display = Display::Block;
    bool hidden = false;  // display: none

    // Spacing
    float lineSpacingMultiplier = 1.4f;
    float letterSpacing = 0;
    float wordSpacing = 0;
    float paragraphSpacingAfter = 12.0f;

    // Block margins (from CSS, in px after em conversion)
    float marginTop = 0;
    float marginBottom = 0;
    float marginLeft = 0;
    float marginRight = 0;
    float paddingLeft = 0;
    float paddingRight = 0;

    // Text transform
    TextTransform textTransform = TextTransform::None;

    // Advanced typography
    bool oldstyleNums = false;
    bool hangingPunctuation = false;

    // Block sizing
    float widthPercent = 0;           // width as percentage (0 = no constraint)
    float widthPx = 0;               // width in px (from em/px CSS values, 0 = no constraint)
    float maxWidthPercent = 100.0f;  // max-width as percentage (100 = no constraint)
    float maxWidthPx = 0;            // max-width in px (from em/px CSS values, 0 = no constraint)
    bool horizontalCentering = false;  // margin-left: auto + margin-right: auto

    // Pagination control
    bool breakInsideAvoid = false;    // break-inside: avoid
    bool breakAfterAvoid = false;     // break-after: avoid
    bool breakBeforePage = false;     // break-before: page (force new page before)
    bool breakAfterPage = false;      // break-after: page (force new page after)
    int orphans = 2;                  // min lines to keep at bottom of page
    int widows = 2;                   // min lines to keep at top of new page

    // Vertical centering (from ancestor with display:flex + justify-content:center)
    bool verticalCenter = false;

    // List
    bool listStyleNone = false;      // list-style: none (suppress markers)

    // Table borders
    bool borderCollapse = false;     // border-collapse: collapse
    float borderLeftWidth = 0;       // border-left-width in px

    // HR specific
    std::optional<HRStyle> hrStyle;
};

/// Computed style for a single inline element within a block.
/// Fields are overrides relative to the parent BlockComputedStyle.
/// nullopt = inherit from block.
struct InlineComputedStyle {
    std::optional<float> fontSizeMultiplier;   // Relative to block font size
    std::optional<FontStyle> fontStyle;
    std::optional<FontWeight> fontWeight;
    std::optional<bool> smallCaps;
    std::optional<TextTransform> textTransform;

    bool isSuperscript = false;    // vertical-align: super
    bool isSubscript = false;      // vertical-align: sub
    bool underline = false;        // text-decoration: underline
    bool noWrap = false;           // white-space: nowrap
    bool displayBlock = false;     // display: block (promote inline to block)
};

} // namespace typesetting
