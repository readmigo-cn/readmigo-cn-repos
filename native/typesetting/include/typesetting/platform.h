#pragma once

#include <string>
#include <vector>
#include <optional>
#include <cstdint>

namespace typesetting {

/// Image dimensions returned by platform
struct ImageSize {
    float width = 0;
    float height = 0;
};

/// Font weight values matching CSS font-weight
enum class FontWeight : uint16_t {
    Thin       = 100,
    Light      = 300,
    Regular    = 400,
    Medium     = 500,
    Semibold   = 600,
    Bold       = 700,
    Heavy      = 900,
};

/// Font style
enum class FontStyle {
    Normal,
    Italic,
};

/// Font descriptor for requesting a specific font
struct FontDescriptor {
    std::string family;
    float size = 16.0f;
    FontWeight weight = FontWeight::Regular;
    FontStyle style = FontStyle::Normal;
};

/// Metrics for a resolved font
struct FontMetrics {
    float ascent = 0;       // Distance from baseline to top
    float descent = 0;      // Distance from baseline to bottom (positive)
    float leading = 0;      // Inter-line spacing recommended by font
    float xHeight = 0;      // Height of lowercase 'x'
    float capHeight = 0;    // Height of capital letters

    float lineHeight() const { return ascent + descent + leading; }
};

/// Result of measuring a text run
struct TextMeasurement {
    float width = 0;
    float height = 0;
};

/// Ink overhang of a glyph cluster relative to its typographic origin.
/// Positive values indicate the ink extends beyond the advance box on that side.
/// Used to expand selection rects so wide-top capitals (T/V/W/A/S) are fully covered.
struct InkOverhang {
    float left = 0;
    float right = 0;
};

/// Abstract interface for platform-specific font operations.
/// iOS: implement with CoreText
/// Android: implement with Skia/HarfBuzz
class PlatformAdapter {
public:
    virtual ~PlatformAdapter() = default;

    /// Resolve a font descriptor to platform font handle and return metrics
    virtual FontMetrics resolveFontMetrics(const FontDescriptor& desc) = 0;

    /// Measure the width of a text string with the given font
    virtual TextMeasurement measureText(const std::string& text,
                                        const FontDescriptor& font) = 0;

    /// Find a valid line break position within text that fits maxWidth.
    /// Returns the character index where the break should occur.
    /// If the entire text fits, returns text.length().
    virtual size_t findLineBreak(const std::string& text,
                                 const FontDescriptor& font,
                                 float maxWidth) = 0;

    /// Check if hyphenation is available for the given locale
    virtual bool supportsHyphenation(const std::string& locale) = 0;

    /// Find hyphenation points in a word.
    /// Returns valid break positions (character indices).
    virtual std::vector<size_t> findHyphenationPoints(const std::string& word,
                                                      const std::string& locale) = 0;

    /// Measure the x-offset (in pixels) at a given UTF-8 byte position within a text run.
    /// Used for precise per-character positioning (e.g., TTS word highlighting).
    /// Returns the pixel offset from the start of the text to the given byte position.
    virtual float measureOffset(const std::string& text,
                                const FontDescriptor& font,
                                int byteOffset) = 0;

    /// Return the ink overhang of the substring [byteOffset, byteOffset+byteLength)
    /// relative to its typographic advance box.
    /// `left` is how far the substring's leading ink protrudes to the LEFT of the
    /// typographic origin; `right` is how far the trailing ink protrudes to the
    /// RIGHT of the typographic end. Both are non-negative on overhang.
    /// Default implementation returns zeros — platforms that can compute true ink
    /// bounds (CoreText, FreeType) should override.
    virtual InkOverhang getInkOverhang(const std::string& text,
                                       const FontDescriptor& font,
                                       int byteOffset,
                                       int byteLength) {
        (void)text; (void)font; (void)byteOffset; (void)byteLength;
        return {0.0f, 0.0f};
    }

    /// Get the natural dimensions of an image.
    /// Returns nullopt if the image is not available or dimensions unknown.
    virtual std::optional<ImageSize> getImageSize(const std::string& src) {
        return std::nullopt;
    }
};

} // namespace typesetting
