#pragma once

#include <algorithm>

namespace typesetting {

/// Device-responsive layout profile computed from screen dimensions and safe areas.
/// Shared across iOS and Android — all adaptive layout logic lives here.
struct LayoutProfile {
    // Computed margins (incorporate safe areas)
    float marginTop = 80.0f;
    float marginBottom = 52.0f;
    float marginLeft = 48.0f;
    float marginRight = 64.0f;

    // Header/footer positioning (absolute Y from page top)
    float headerY = 32.0f;
    float footerY = 0.0f;  // computed from screenHeight

    // Header/footer font sizes
    float headerFontSize = 10.0f;
    float footerFontSize = 10.0f;

    // Suggested typography (platform may override with user settings)
    float suggestedFontSize = 20.0f;
    float suggestedLineHeight = 1.6f;
};

/// Compute a device-responsive layout profile using continuous interpolation.
/// All parameters adapt smoothly based on screen width (no discrete breakpoints).
///
/// @param screenWidth  Screen width in points/dp
/// @param screenHeight Screen height in points/dp
/// @param safeTop      Top safe area inset (notch, status bar)
/// @param safeBottom   Bottom safe area inset (home indicator, nav bar)
/// @param safeLeft     Left safe area inset
/// @param safeRight    Right safe area inset
inline LayoutProfile computeLayoutProfile(
    float screenWidth, float screenHeight,
    float safeTop, float safeBottom,
    float safeLeft, float safeRight)
{
    // Linear interpolation between narrow (320pt) and wide (768pt) anchors
    const float kNarrow = 320.0f;
    const float kWide = 768.0f;
    float t = std::clamp((screenWidth - kNarrow) / (kWide - kNarrow), 0.0f, 1.0f);

    auto lerp = [](float a, float b, float t) { return a + t * (b - a); };

    LayoutProfile p;

    // Margins: narrow screens get tight margins, wide screens get generous margins
    p.marginLeft  = lerp(std::max(20.0f, safeLeft + 12.0f), 36.0f, t);
    p.marginRight = lerp(std::max(20.0f, safeRight + 12.0f), 36.0f, t);
    p.marginTop   = lerp(safeTop + 24.0f, 60.0f, t);
    p.marginBottom = lerp(safeBottom + 16.0f, 44.0f, t);

    // Header: must clear the notch/safe area (account for font ascent)
    p.headerY = lerp(safeTop + 20.0f, 32.0f, t);
    // Footer: must stay above home indicator/safe area
    p.footerY = lerp(screenHeight - safeBottom - 16.0f, screenHeight - 28.0f, t);

    // Header/footer font sizes
    p.headerFontSize = lerp(9.0f, 10.0f, t);
    p.footerFontSize = lerp(9.0f, 10.0f, t);

    // Suggested body typography
    p.suggestedFontSize  = lerp(16.0f, 20.0f, t);
    p.suggestedLineHeight = lerp(1.0f, 1.6f, t);

    return p;
}

} // namespace typesetting
