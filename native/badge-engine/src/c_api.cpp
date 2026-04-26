#include "badge_engine/badge_engine.h"
#include "engine.h"

extern "C" {

BadgeEngine* badge_engine_create(const BadgeEngineConfig* config) {
    if (!config) return nullptr;
    auto* engine = new (std::nothrow) badge::Engine(*config);
    return reinterpret_cast<BadgeEngine*>(engine);
}

void badge_engine_destroy(BadgeEngine* engine) {
    delete reinterpret_cast<badge::Engine*>(engine);
}

int badge_engine_set_surface(BadgeEngine* engine, void* native_surface, uint32_t width, uint32_t height) {
    if (!engine) return -1;
    return reinterpret_cast<badge::Engine*>(engine)->setSurface(native_surface, width, height);
}

int badge_engine_load_badge(BadgeEngine* engine, const char* badge_path) {
    if (!engine || !badge_path) return -1;
    return reinterpret_cast<badge::Engine*>(engine)->loadBadge(badge_path);
}

void badge_engine_unload_badge(BadgeEngine* engine) {
    if (engine) reinterpret_cast<badge::Engine*>(engine)->unloadBadge();
}

void badge_engine_set_render_mode(BadgeEngine* engine, BadgeRenderMode mode) {
    if (engine) reinterpret_cast<badge::Engine*>(engine)->setRenderMode(mode);
}

void badge_engine_update_gyro(BadgeEngine* engine, float x, float y, float z) {
    if (engine) reinterpret_cast<badge::Engine*>(engine)->updateGyro(x, y, z);
}

void badge_engine_on_touch(BadgeEngine* engine, const BadgeTouchEvent* event) {
    if (engine && event) reinterpret_cast<badge::Engine*>(engine)->onTouch(*event);
}

void badge_engine_set_orientation(BadgeEngine* engine, float rx, float ry, float rz, float scale) {
    if (engine) reinterpret_cast<badge::Engine*>(engine)->setOrientation(rx, ry, rz, scale);
}

void badge_engine_play_ceremony(BadgeEngine* engine, BadgeCeremonyType type) {
    if (engine) reinterpret_cast<badge::Engine*>(engine)->playCeremony(type);
}

void badge_engine_render_frame(BadgeEngine* engine) {
    if (engine) reinterpret_cast<badge::Engine*>(engine)->renderFrame();
}

int badge_engine_snapshot(BadgeEngine* engine, uint8_t* buffer, uint32_t width, uint32_t height) {
    if (!engine || !buffer) return -1;
    return reinterpret_cast<badge::Engine*>(engine)->snapshot(buffer, width, height);
}

void badge_engine_set_callback(BadgeEngine* engine, BadgeEventCallback callback, void* user_data) {
    if (engine) reinterpret_cast<badge::Engine*>(engine)->setCallback(callback, user_data);
}

int badge_engine_load_model_data(BadgeEngine* engine, const uint8_t* glb_data, uint32_t data_size) {
    if (!engine || !glb_data) return -1;
    return reinterpret_cast<badge::Engine*>(engine)->loadModelData(glb_data, data_size);
}

int badge_engine_set_face_texture(BadgeEngine* engine, BadgeFaceIndex face,
                                   const uint8_t* rgba_data, uint32_t width, uint32_t height) {
    if (!engine || !rgba_data) return -1;
    return reinterpret_cast<badge::Engine*>(engine)->setFaceTexture(static_cast<int>(face), rgba_data, width, height);
}

int badge_engine_set_face_material(BadgeEngine* engine, BadgeFaceIndex face,
                                    const char* material_json) {
    if (!engine || !material_json) return -1;
    return reinterpret_cast<badge::Engine*>(engine)->setFaceMaterial(static_cast<int>(face), material_json);
}

} // extern "C"
