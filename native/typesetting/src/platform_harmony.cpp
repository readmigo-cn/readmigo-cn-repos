#include "typesetting/platform_harmony.h"

#include <algorithm>
#include <cmath>

namespace typesetting {

namespace {

bool isUtf8ContinuationByte(unsigned char byte) {
    return (byte & 0xC0) == 0x80;
}

} // namespace

HarmonyPlatformAdapter::HarmonyPlatformAdapter(HarmonyPlatformOptions options)
    : options_(std::move(options)) {}

FontMetrics HarmonyPlatformAdapter::resolveFontMetrics(const FontDescriptor& desc) {
    const float size = effectiveFontSize(desc);
    const float lineHeight = size * options_.defaultLineHeightMultiplier;

    FontMetrics metrics;
    metrics.ascent = size * 0.8f;
    metrics.descent = size * 0.2f;
    metrics.leading = std::max(0.0f, lineHeight - (metrics.ascent + metrics.descent));
    metrics.xHeight = size * 0.52f;
    metrics.capHeight = size * 0.72f;
    return metrics;
}

TextMeasurement HarmonyPlatformAdapter::measureText(const std::string& text,
                                                    const FontDescriptor& font) {
    const float fontSize = effectiveFontSize(font);
    float width = 0.0f;

    for (unsigned char byte : text) {
      if (isUtf8ContinuationByte(byte)) {
        continue;
      }
      width += estimatedGlyphWidth(byte, fontSize);
    }

    return {
        .width = width,
        .height = resolveFontMetrics(font).lineHeight(),
    };
}

size_t HarmonyPlatformAdapter::findLineBreak(const std::string& text,
                                             const FontDescriptor& font,
                                             float maxWidth) {
    if (text.empty()) {
        return 0;
    }

    float currentWidth = 0.0f;
    size_t lastWhitespace = std::string::npos;
    const float fontSize = effectiveFontSize(font);

    for (size_t i = 0; i < text.size(); ++i) {
        const unsigned char byte = static_cast<unsigned char>(text[i]);
        if (isUtf8ContinuationByte(byte)) {
            continue;
        }

        currentWidth += estimatedGlyphWidth(byte, fontSize);
        if (std::isspace(byte)) {
            lastWhitespace = i;
        }

        if (currentWidth > maxWidth) {
            if (lastWhitespace != std::string::npos) {
                return lastWhitespace + 1;
            }
            return std::max<size_t>(1, i);
        }
    }

    return text.size();
}

bool HarmonyPlatformAdapter::supportsHyphenation(const std::string& locale) {
    return locale.rfind("en", 0) == 0;
}

std::vector<size_t> HarmonyPlatformAdapter::findHyphenationPoints(const std::string& word,
                                                                  const std::string& locale) {
    if (!supportsHyphenation(locale) || word.size() < 6) {
        return {};
    }

    std::vector<size_t> points;
    for (size_t i = 3; i + 3 < word.size(); ++i) {
        const unsigned char byte = static_cast<unsigned char>(word[i]);
        if (!std::isalpha(byte)) {
            continue;
        }
        if ((i % 3) == 0) {
            points.push_back(i);
        }
    }
    return points;
}

float HarmonyPlatformAdapter::measureOffset(const std::string& text,
                                            const FontDescriptor& font,
                                            int byteOffset) {
    if (byteOffset <= 0) {
        return 0.0f;
    }

    const size_t safeOffset = std::min(text.size(), static_cast<size_t>(byteOffset));
    return measureText(text.substr(0, safeOffset), font).width;
}

InkOverhang HarmonyPlatformAdapter::getInkOverhang(const std::string&,
                                                   const FontDescriptor&,
                                                   int,
                                                   int) {
    return {0.0f, 0.0f};
}

float HarmonyPlatformAdapter::effectiveFontSize(const FontDescriptor& font) const {
    return std::max(1.0f, font.size * options_.defaultFontScale);
}

float HarmonyPlatformAdapter::estimatedGlyphWidth(unsigned char byte, float fontSize) const {
    if (byte < 0x80) {
        if (std::isspace(byte)) {
            return fontSize * 0.33f;
        }
        if (std::isdigit(byte)) {
            return fontSize * 0.56f;
        }
        return fontSize * 0.58f;
    }

    // Assume wider glyphs for non-ASCII code points such as CJK characters.
    return fontSize * 0.95f;
}

std::shared_ptr<PlatformAdapter> createHarmonyPlatformAdapter(HarmonyPlatformOptions options) {
    return std::make_shared<HarmonyPlatformAdapter>(std::move(options));
}

} // namespace typesetting
