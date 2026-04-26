#pragma once

#include "typesetting/platform.h"

#include <memory>
#include <string>

namespace typesetting {

struct HarmonyPlatformOptions {
    float defaultFontScale = 1.0f;
    float defaultLineHeightMultiplier = 1.35f;
    std::string defaultLocale = "zh-CN";
};

/// HarmonyOS placeholder implementation of PlatformAdapter.
/// This adapter is intentionally conservative: it provides predictable fallback
/// behavior until real Harmony font measurement and line-breaking hooks are wired in.
class HarmonyPlatformAdapter final : public PlatformAdapter {
public:
    explicit HarmonyPlatformAdapter(HarmonyPlatformOptions options = {});

    FontMetrics resolveFontMetrics(const FontDescriptor& desc) override;
    TextMeasurement measureText(const std::string& text, const FontDescriptor& font) override;
    size_t findLineBreak(const std::string& text, const FontDescriptor& font, float maxWidth) override;
    bool supportsHyphenation(const std::string& locale) override;
    std::vector<size_t> findHyphenationPoints(const std::string& word, const std::string& locale) override;
    float measureOffset(const std::string& text, const FontDescriptor& font, int byteOffset) override;
    InkOverhang getInkOverhang(const std::string& text,
                               const FontDescriptor& font,
                               int byteOffset,
                               int byteLength) override;

private:
    HarmonyPlatformOptions options_;

    float effectiveFontSize(const FontDescriptor& font) const;
    float estimatedGlyphWidth(unsigned char byte, float fontSize) const;
};

std::shared_ptr<PlatformAdapter> createHarmonyPlatformAdapter(
    HarmonyPlatformOptions options = {});

} // namespace typesetting
