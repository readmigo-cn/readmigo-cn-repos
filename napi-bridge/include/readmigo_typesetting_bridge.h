#pragma once

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef void* ReadmigoTypesettingHandle;

typedef struct ReadmigoTypesettingCreateOptions {
  float font_scale;
  float line_height_multiplier;
  const char* default_locale;
} ReadmigoTypesettingCreateOptions;

typedef struct ReadmigoTypesettingLayoutOptions {
  const char* chapter_id;
  float page_width;
  float page_height;
  float font_size;
  const char* locale;
} ReadmigoTypesettingLayoutOptions;

typedef struct ReadmigoTypesettingLayoutSummary {
  uint32_t page_count;
  uint32_t total_blocks;
  uint32_t warning_count;
} ReadmigoTypesettingLayoutSummary;

ReadmigoTypesettingHandle readmigo_typesetting_create(
    const ReadmigoTypesettingCreateOptions* options);

void readmigo_typesetting_destroy(ReadmigoTypesettingHandle handle);

int readmigo_typesetting_layout_html(
    ReadmigoTypesettingHandle handle,
    const char* html,
    const ReadmigoTypesettingLayoutOptions* options,
    ReadmigoTypesettingLayoutSummary* out_summary);

#ifdef __cplusplus
}
#endif
