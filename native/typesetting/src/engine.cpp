#include "typesetting/engine.h"
#include "typesetting/css.h"
#include "typesetting/style_resolver.h"
#include "typesetting/log.h"
#include <algorithm>
#include <stdexcept>

namespace typesetting {

Engine::Engine(std::shared_ptr<PlatformAdapter> platform)
    : platform_(std::move(platform))
    , layoutEngine_(std::make_unique<LayoutEngine>(platform_)) {}

Engine::~Engine() = default;

// ---------------------------------------------------------------------------
// Multi-chapter state management
// ---------------------------------------------------------------------------

ChapterState& Engine::getOrCreateChapter(const std::string& chapterId) {
    auto it = chapters_.find(chapterId);
    if (it != chapters_.end()) {
        touchChapter(chapterId);
        return it->second;
    }
    evictIfNeeded();
    chapters_[chapterId] = ChapterState{};
    chapterOrder_.push_back(chapterId);
    return chapters_[chapterId];
}

const ChapterState* Engine::findChapter(const std::string& chapterId) const {
    auto it = chapters_.find(chapterId);
    return (it != chapters_.end()) ? &it->second : nullptr;
}

void Engine::touchChapter(const std::string& chapterId) {
    auto it = std::find(chapterOrder_.begin(), chapterOrder_.end(), chapterId);
    if (it != chapterOrder_.end()) {
        chapterOrder_.erase(it);
    }
    chapterOrder_.push_back(chapterId);
}

void Engine::evictIfNeeded() {
    while (chapters_.size() >= kMaxChapters && !chapterOrder_.empty()) {
        const auto& oldest = chapterOrder_.front();
        TS_LOGI("evicting chapter '%s' (capacity=%zu)", oldest.c_str(), kMaxChapters);
        chapters_.erase(oldest);
        chapterOrder_.pop_front();
    }
}

void Engine::evictChapter(const std::string& chapterId) {
    if (chapters_.erase(chapterId) > 0) {
        auto it = std::find(chapterOrder_.begin(), chapterOrder_.end(), chapterId);
        if (it != chapterOrder_.end()) chapterOrder_.erase(it);
        TS_LOGI("evicted chapter '%s'", chapterId.c_str());
    }
    if (activeChapterId_ == chapterId) {
        activeChapterId_.clear();
    }
}

void Engine::evictAll() {
    chapters_.clear();
    chapterOrder_.clear();
    activeChapterId_.clear();
    TS_LOGI("evicted all chapters");
}

// ---------------------------------------------------------------------------
// Layout methods
// ---------------------------------------------------------------------------

LayoutResult Engine::layoutHTML(const std::string& html,
                                const std::string& chapterId,
                                const Style& style,
                                const PageSize& pageSize) {
    TS_LOGI("layoutHTML: chapter='%s' html=%zu page=%.0fx%.0f",
            chapterId.c_str(), html.size(), pageSize.width, pageSize.height);

    auto& state = getOrCreateChapter(chapterId);

    try {
        state.blocks = parseHTML(html);
    } catch (const std::exception& e) {
        TS_LOGW("layoutHTML: parse failed for '%s': %s", chapterId.c_str(), e.what());
        LayoutResult result;
        result.chapterId = chapterId;
        result.warnings.push_back(LayoutWarning::ParseError);
        return result;
    } catch (...) {
        TS_LOGW("layoutHTML: unknown exception parsing '%s'", chapterId.c_str());
        LayoutResult result;
        result.chapterId = chapterId;
        result.warnings.push_back(LayoutWarning::ParseError);
        return result;
    }
    state.hasStylesheet = false;
    activeChapterId_ = chapterId;

    auto result = layoutEngine_->layoutChapter(
        Chapter{chapterId, "", 0, state.blocks}, style, pageSize);

    if (state.blocks.empty()) {
        result.warnings.push_back(LayoutWarning::EmptyContent);
    }

    updateInteractionCache(chapterId, result);

    TS_LOGI("layoutHTML: chapter='%s' blocks=%d pages=%zu warnings=%zu",
            chapterId.c_str(), result.totalBlocks,
            result.pages.size(), result.warnings.size());
    return result;
}

LayoutResult Engine::layoutHTML(const std::string& html,
                                const std::string& css,
                                const std::string& chapterId,
                                const Style& style,
                                const PageSize& pageSize) {
    std::string htmlPreview = html.substr(0, std::min(html.size(), size_t(300)));
    TS_LOGI("layoutHTML+CSS: chapter='%s' html=%zu css=%zu page=%.0fx%.0f",
            chapterId.c_str(), html.size(), css.size(),
            pageSize.width, pageSize.height);
    TS_LOGI("layoutHTML+CSS: HTML_START='%s'", htmlPreview.c_str());

    auto& state = getOrCreateChapter(chapterId);

    try {
        state.stylesheet = CSSStylesheet::parse(css);
        state.hasStylesheet = true;
        state.blocks = parseHTML(html);
    } catch (const std::exception& e) {
        TS_LOGW("layoutHTML+CSS: parse failed for '%s': %s", chapterId.c_str(), e.what());
        LayoutResult result;
        result.chapterId = chapterId;
        result.warnings.push_back(LayoutWarning::ParseError);
        return result;
    } catch (...) {
        TS_LOGW("layoutHTML+CSS: unknown exception parsing '%s'", chapterId.c_str());
        LayoutResult result;
        result.chapterId = chapterId;
        result.warnings.push_back(LayoutWarning::ParseError);
        return result;
    }
    activeChapterId_ = chapterId;

    TS_LOGI("layoutHTML+CSS: parsed %zu blocks, first block text='%s'",
            state.blocks.size(),
            state.blocks.empty() ? "(empty)" : state.blocks[0].plainText().substr(0, std::min(state.blocks[0].plainText().size(), size_t(150))).c_str());

    StyleResolver resolver(state.stylesheet);
    auto resolved = resolver.resolve(state.blocks, style);

    int hiddenCount = 0;
    for (size_t i = 0; i < resolved.blockStyles.size(); ++i) {
        if (resolved.blockStyles[i].hidden) {
            hiddenCount++;
            std::string blockText = (i < state.blocks.size()) ? state.blocks[i].plainText() : "";
            if (blockText.size() > 100) blockText = blockText.substr(0, 100) + "...";
            TS_LOGI("layoutHTML+CSS: HIDDEN block[%zu] text='%s'", i, blockText.c_str());
        }
    }
    if (hiddenCount > 0) {
        TS_LOGI("layoutHTML+CSS: %d blocks hidden by CSS", hiddenCount);
    }

    if (!resolved.expandedBlocks.empty()) {
        TS_LOGI("layoutHTML+CSS: display:block expansion %zu -> %zu blocks",
                state.blocks.size(), resolved.expandedBlocks.size());
        state.blocks = std::move(resolved.expandedBlocks);
    }
    state.styles = resolved.blockStyles;

    auto result = layoutEngine_->layoutChapter(
        Chapter{chapterId, "", 0, state.blocks}, state.styles, style, pageSize);

    if (state.blocks.empty()) {
        result.warnings.push_back(LayoutWarning::EmptyContent);
    }

    updateInteractionCache(chapterId, result);

    for (size_t pi = 0; pi < result.pages.size() && pi < 5; ++pi) {
        const auto& page = result.pages[pi];
        std::string firstRunText;
        if (!page.lines.empty() && !page.lines[0].runs.empty()) {
            firstRunText = page.lines[0].runs[0].text;
            if (firstRunText.size() > 80) firstRunText = firstRunText.substr(0, 80) + "...";
        }
        TS_LOGI("layoutHTML+CSS: page[%zu] blocks=[%d..%d] lines=%zu firstText='%s'",
                pi, page.firstBlockIndex, page.lastBlockIndex,
                page.lines.size(), firstRunText.c_str());
    }

    TS_LOGI("layoutHTML+CSS: chapter='%s' blocks=%d pages=%zu warnings=%zu",
            chapterId.c_str(), result.totalBlocks,
            result.pages.size(), result.warnings.size());
    return result;
}

LayoutResult Engine::layoutBlocks(const std::vector<Block>& blocks,
                                   const std::string& chapterId,
                                   const Style& style,
                                   const PageSize& pageSize) {
    TS_LOGI("layoutBlocks: chapter='%s' blocks=%zu page=%.0fx%.0f",
            chapterId.c_str(), blocks.size(), pageSize.width, pageSize.height);

    auto& state = getOrCreateChapter(chapterId);
    state.blocks = blocks;
    state.hasStylesheet = false;
    activeChapterId_ = chapterId;

    auto result = layoutEngine_->layoutChapter(
        Chapter{chapterId, "", 0, blocks}, style, pageSize);

    if (blocks.empty()) {
        result.warnings.push_back(LayoutWarning::EmptyContent);
    }

    updateInteractionCache(chapterId, result);

    TS_LOGI("layoutBlocks: chapter='%s' pages=%zu warnings=%zu",
            chapterId.c_str(), result.pages.size(), result.warnings.size());
    return result;
}

LayoutResult Engine::relayout(const Style& style,
                               const PageSize& pageSize) {
    auto* state = const_cast<ChapterState*>(findChapter(activeChapterId_));
    if (!state || state->blocks.empty()) {
        TS_LOGW("relayout: empty content for '%s'", activeChapterId_.c_str());
        LayoutResult result;
        result.chapterId = activeChapterId_;
        result.warnings.push_back(LayoutWarning::EmptyContent);
        return result;
    }

    TS_LOGI("relayout: chapter='%s' blocks=%zu page=%.0fx%.0f",
            activeChapterId_.c_str(), state->blocks.size(),
            pageSize.width, pageSize.height);

    LayoutResult result;
    if (state->hasStylesheet) {
        StyleResolver resolver(state->stylesheet);
        auto resolved = resolver.resolve(state->blocks, style);
        if (!resolved.expandedBlocks.empty()) {
            state->blocks = std::move(resolved.expandedBlocks);
        }
        state->styles = resolved.blockStyles;
        result = layoutEngine_->layoutChapter(
            Chapter{activeChapterId_, "", 0, state->blocks}, state->styles, style, pageSize);
    } else {
        result = layoutEngine_->layoutChapter(
            Chapter{activeChapterId_, "", 0, state->blocks}, style, pageSize);
    }

    updateInteractionCache(activeChapterId_, result);

    TS_LOGI("relayout: chapter='%s' pages=%zu", activeChapterId_.c_str(), result.pages.size());
    return result;
}

std::shared_ptr<PlatformAdapter> Engine::platform() const {
    return platform_;
}

// ---------------------------------------------------------------------------
// Chapter title & cover
// ---------------------------------------------------------------------------

void Engine::setChapterTitle(const std::string& chapterId, const std::string& title) {
    auto* state = const_cast<ChapterState*>(findChapter(chapterId));
    if (state) {
        state->chapterTitle = title;
        state->interactionMgr.setChapterTitle(title);
    }
}

void Engine::setChapterTitle(const std::string& title) {
    setChapterTitle(activeChapterId_, title);
}

LayoutResult Engine::layoutCover(const std::string& imageSrc, const PageSize& pageSize) {
    TS_LOGI("layoutCover: image='%s' page=%.0fx%.0f",
            imageSrc.c_str(), pageSize.width, pageSize.height);

    LayoutResult result;
    result.chapterId = "__cover__";

    Page page;
    page.pageIndex = 0;
    page.width = pageSize.width;
    page.height = pageSize.height;
    page.contentX = 0;
    page.contentY = 0;
    page.contentWidth = pageSize.width;
    page.contentHeight = pageSize.height;

    Decoration deco;
    deco.type = DecorationType::ImagePlaceholder;
    deco.x = 0;
    deco.y = 0;
    deco.width = pageSize.width;
    deco.height = pageSize.height;
    deco.imageSrc = imageSrc;
    page.decorations.push_back(deco);

    result.pages.push_back(page);
    return result;
}

// ---------------------------------------------------------------------------
// Interaction queries — chapterId overloads
// ---------------------------------------------------------------------------

HitTestResult Engine::hitTest(const std::string& chapterId, int pageIndex, float x, float y) const {
    if (auto* s = findChapter(chapterId)) return s->interactionMgr.hitTest(pageIndex, x, y);
    return {};
}

WordRange Engine::wordAtPoint(const std::string& chapterId, int pageIndex, float x, float y) const {
    if (auto* s = findChapter(chapterId)) return s->interactionMgr.wordAtPoint(pageIndex, x, y);
    return {};
}

std::vector<SentenceRange> Engine::getSentences(const std::string& chapterId, int pageIndex) const {
    if (auto* s = findChapter(chapterId)) return s->interactionMgr.getSentences(pageIndex);
    return {};
}

std::vector<SentenceRange> Engine::getAllSentences(const std::string& chapterId) const {
    if (auto* s = findChapter(chapterId)) return s->interactionMgr.getAllSentences();
    return {};
}

std::vector<TextRect> Engine::getRectsForRange(const std::string& chapterId, int pageIndex,
                                                int blockIndex, int charOffset, int charLength) const {
    if (auto* s = findChapter(chapterId)) return s->interactionMgr.getRectsForRange(pageIndex, blockIndex, charOffset, charLength);
    return {};
}

std::vector<TextRect> Engine::getPreciseRectsForRange(const std::string& chapterId, int pageIndex,
                                                       int blockIndex, int charOffset, int charLength) const {
    if (auto* s = findChapter(chapterId)) return s->interactionMgr.getPreciseRectsForRange(pageIndex, blockIndex, charOffset, charLength);
    return {};
}

std::vector<TextRect> Engine::getRectsForRangeInkAware(const std::string& chapterId, int pageIndex,
                                                        int blockIndex, int charOffset, int charLength) const {
    if (auto* s = findChapter(chapterId)) return s->interactionMgr.getRectsForRangeInkAware(pageIndex, blockIndex, charOffset, charLength);
    return {};
}

TextRect Engine::getBlockRect(const std::string& chapterId, int pageIndex, int blockIndex) const {
    if (auto* s = findChapter(chapterId)) return s->interactionMgr.getBlockRect(pageIndex, blockIndex);
    return {};
}

ImageHitResult Engine::hitTestImage(const std::string& chapterId, int pageIndex, float x, float y) const {
    if (auto* s = findChapter(chapterId)) return s->interactionMgr.hitTestImage(pageIndex, x, y);
    return {};
}

PageInfo Engine::getPageInfo(const std::string& chapterId, int pageIndex) const {
    if (auto* s = findChapter(chapterId)) return s->interactionMgr.getPageInfo(pageIndex);
    return {};
}

// ---------------------------------------------------------------------------
// Interaction queries — backward-compatible (active chapter)
// ---------------------------------------------------------------------------

HitTestResult Engine::hitTest(int pageIndex, float x, float y) const {
    return hitTest(activeChapterId_, pageIndex, x, y);
}

WordRange Engine::wordAtPoint(int pageIndex, float x, float y) const {
    return wordAtPoint(activeChapterId_, pageIndex, x, y);
}

std::vector<SentenceRange> Engine::getSentences(int pageIndex) const {
    return getSentences(activeChapterId_, pageIndex);
}

std::vector<SentenceRange> Engine::getAllSentences() const {
    return getAllSentences(activeChapterId_);
}

std::vector<TextRect> Engine::getRectsForRange(int pageIndex, int blockIndex,
                                                int charOffset, int charLength) const {
    return getRectsForRange(activeChapterId_, pageIndex, blockIndex, charOffset, charLength);
}

std::vector<TextRect> Engine::getPreciseRectsForRange(int pageIndex, int blockIndex,
                                                       int charOffset, int charLength) const {
    return getPreciseRectsForRange(activeChapterId_, pageIndex, blockIndex, charOffset, charLength);
}

std::vector<TextRect> Engine::getRectsForRangeInkAware(int pageIndex, int blockIndex,
                                                        int charOffset, int charLength) const {
    return getRectsForRangeInkAware(activeChapterId_, pageIndex, blockIndex, charOffset, charLength);
}

TextRect Engine::getBlockRect(int pageIndex, int blockIndex) const {
    return getBlockRect(activeChapterId_, pageIndex, blockIndex);
}

ImageHitResult Engine::hitTestImage(int pageIndex, float x, float y) const {
    return hitTestImage(activeChapterId_, pageIndex, x, y);
}

PageInfo Engine::getPageInfo(int pageIndex) const {
    return getPageInfo(activeChapterId_, pageIndex);
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

void Engine::updateInteractionCache(const std::string& chapterId, const LayoutResult& result) {
    auto* state = const_cast<ChapterState*>(findChapter(chapterId));
    if (state) {
        state->interactionMgr.setPlatform(platform_);
        state->interactionMgr.setLayoutResult(result, state->blocks, state->chapterTitle);
    }
}

} // namespace typesetting
