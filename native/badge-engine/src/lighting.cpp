#include "lighting.h"
#include <nlohmann/json.hpp>
#include <fstream>
#include <cmath>

namespace badge {

bool LightingSystem::loadConfig(const std::string& config_path) {
    std::ifstream file(config_path);
    if (!file.is_open()) return false;

    nlohmann::json j;
    try {
        file >> j;
    } catch (...) {
        return false;
    }

    if (j.contains("ibl")) {
        ibl_enabled_ = j["ibl"].value("enabled", false);
        ibl_intensity_ = j["ibl"].value("intensity", 30000.0f);
    }

    if (j.contains("directional")) {
        directional_enabled_ = j["directional"].value("enabled", false);
        if (directional_enabled_ && j["directional"].contains("key")) {
            auto& key = j["directional"]["key"];
            key_intensity_ = key.value("intensity", 0.0f);
            if (key.contains("color")) {
                auto& c = key["color"];
                key_color_ = {c[0].get<float>(), c[1].get<float>(), c[2].get<float>()};
            }
            if (key.contains("direction")) {
                auto& d = key["direction"];
                key_direction_base_ = {d[0].get<float>(), d[1].get<float>(), d[2].get<float>()};
                key_direction_ = key_direction_base_;
            }
        }
        if (directional_enabled_ && j["directional"].contains("fill")) {
            fill_intensity_ = j["directional"]["fill"].value("intensity", 0.0f);
            if (j["directional"]["fill"].contains("color")) {
                auto& c = j["directional"]["fill"]["color"];
                fill_color_ = {c[0].get<float>(), c[1].get<float>(), c[2].get<float>()};
            }
        }
    }

    if (j.contains("accent")) {
        accent_enabled_ = j["accent"].value("enabled", false);
    }

    if (j.contains("sweep")) {
        sweep_enabled_ = j["sweep"].value("enabled", false);
        sweep_speed_ = j["sweep"].value("speed", 1.2f);
        sweep_width_ = j["sweep"].value("width", 0.4f);
        sweep_falloff_ = j["sweep"].value("falloff", 0.05f);
        sweep_intensity_ = j["sweep"].value("intensity", 0.6f);
        sweep_clamp_ = j["sweep"].value("clamp", 0.85f);
    }

    return true;
}

void LightingSystem::updateGyro(float x, float y, float z) {
    if (!directional_enabled_ || !gyro_available_) return;
    applyGyroOffset(x, y);
}

void LightingSystem::setGyroAvailable(bool available) {
    gyro_available_ = available;
}

float LightingSystem::sweepBandCenter() const {
    return std::sin(sweep_time_ * sweep_speed_) * 1.5f;
}

void LightingSystem::tick(float dt) {
    // Advance sweep timer
    if (sweep_enabled_) {
        sweep_time_ += dt;
    }

    if (!directional_enabled_) return;

    if (!gyro_available_) {
        // Auto-oscillation fallback: sine wave, period 4s, amplitude +/-10 degrees
        auto_osc_time_ += dt;
        float offset = AUTO_OSC_AMPLITUDE * std::sin(2.0f * 3.14159265f * auto_osc_time_ / AUTO_OSC_PERIOD);
        applyGyroOffset(offset, offset * 0.7f);
    }
}

void LightingSystem::applyGyroOffset(float pitch, float yaw) {
    // Rotate base direction by pitch/yaw offsets
    float cp = std::cos(pitch), sp = std::sin(pitch);
    float cy = std::cos(yaw),   sy = std::sin(yaw);

    float bx = key_direction_base_[0];
    float by = key_direction_base_[1];
    float bz = key_direction_base_[2];

    // Apply yaw (rotation around Y)
    float rx = bx * cy + bz * sy;
    float ry = by;
    float rz = -bx * sy + bz * cy;

    // Apply pitch (rotation around X)
    key_direction_[0] = rx;
    key_direction_[1] = ry * cp - rz * sp;
    key_direction_[2] = ry * sp + rz * cp;
}

} // namespace badge
