#pragma once

#include "typesetting/document.h"
#include "typesetting/style.h"
#include "typesetting/css.h"
#include "typesetting/layout.h"
#include "typesetting/layout_profile.h"
#include "typesetting/page.h"
#include "typesetting/platform.h"
#include "typesetting/interaction.h"
#include <memory>
#include <unordered_map>
#include <deque>

namespace typesetting {

/// Per-chapter state: parsed blocks, stylesheet, computed styles, interaction data.
/// Enables concurrent multi-chapter queries without "restore bridge state" overhead.
struct ChapterState {
    std::vector<Block> blocks;
    CSSStylesheet stylesheet;
    bool hasStylesheet = false;
    std::vector<BlockComputedStyle> styles;
    std::string chapterTitle;
    InteractionManager interactionMgr;
};

/// Main entry point for the typesetting engine.
/// Coordinates document parsing, styling, and layout.
/// Supports multiple concurrent chapter states indexed by chapterId.
class Engine {
public:
    explicit Engine(std::shared_ptr<PlatformAdapter> platform);
    ~Engine();

    /// Parse HTML content and lay out into pages
    LayoutResult layoutHTML(const std::string& html,
                            const std::string& chapterId,
                            const Style& style,
                            const PageSize& pageSize);

    /// Parse HTML + CSS content and lay out into pages with style resolution
    LayoutResult layoutHTML(const std::string& html,
                            const std::string& css,
                            const std::string& chapterId,
                            const Style& style,
                            const PageSize& pageSize);

    /// Lay out pre-parsed blocks into pages
    LayoutResult layoutBlocks(const std::vector<Block>& blocks,
                              const std::string& chapterId,
                              const Style& style,
                              const PageSize& pageSize);

    /// Re-layout the active chapter with new style (e.g., font size changed)
    /// Uses the last set of blocks without re-parsing
    LayoutResult relayout(const Style& style,
                          const PageSize& pageSize);

    /// Get the platform adapter
    std::shared_ptr<PlatformAdapter> platform() const;

    /// Set the chapter title for page info queries
    void setChapterTitle(const std::string& chapterId, const std::string& title);

    /// Layout a cover page (full-bleed image)
    LayoutResult layoutCover(const std::string& imageSrc, const PageSize& pageSize);

    /// Evict a specific chapter's state
    void evictChapter(const std::string& chapterId);

    /// Evict all chapter states
    void evictAll();

    // -- Interaction queries (delegate to per-chapter InteractionManager) ------

    HitTestResult hitTest(const std::string& chapterId, int pageIndex, float x, float y) const;
    WordRange wordAtPoint(const std::string& chapterId, int pageIndex, float x, float y) const;
    std::vector<SentenceRange> getSentences(const std::string& chapterId, int pageIndex) const;
    std::vector<SentenceRange> getAllSentences(const std::string& chapterId) const;
    std::vector<TextRect> getRectsForRange(const std::string& chapterId, int pageIndex,
                                            int blockIndex, int charOffset, int charLength) const;
    std::vector<TextRect> getPreciseRectsForRange(const std::string& chapterId, int pageIndex,
                                                   int blockIndex, int charOffset, int charLength) const;
    std::vector<TextRect> getRectsForRangeInkAware(const std::string& chapterId, int pageIndex,
                                                    int blockIndex, int charOffset, int charLength) const;
    TextRect getBlockRect(const std::string& chapterId, int pageIndex, int blockIndex) const;
    ImageHitResult hitTestImage(const std::string& chapterId, int pageIndex, float x, float y) const;
    PageInfo getPageInfo(const std::string& chapterId, int pageIndex) const;

    // -- Backward-compatible overloads (use active chapter) -------------------

    HitTestResult hitTest(int pageIndex, float x, float y) const;
    WordRange wordAtPoint(int pageIndex, float x, float y) const;
    std::vector<SentenceRange> getSentences(int pageIndex) const;
    std::vector<SentenceRange> getAllSentences() const;
    std::vector<TextRect> getRectsForRange(int pageIndex, int blockIndex,
                                            int charOffset, int charLength) const;
    std::vector<TextRect> getPreciseRectsForRange(int pageIndex, int blockIndex,
                                                   int charOffset, int charLength) const;
    std::vector<TextRect> getRectsForRangeInkAware(int pageIndex, int blockIndex,
                                                    int charOffset, int charLength) const;
    TextRect getBlockRect(int pageIndex, int blockIndex) const;
    ImageHitResult hitTestImage(int pageIndex, float x, float y) const;
    PageInfo getPageInfo(int pageIndex) const;

    // -- Legacy overload (sets title on active chapter) -----------------------
    void setChapterTitle(const std::string& title);

private:
    std::shared_ptr<PlatformAdapter> platform_;
    std::unique_ptr<LayoutEngine> layoutEngine_;

    // Multi-chapter state
    std::unordered_map<std::string, ChapterState> chapters_;
    std::deque<std::string> chapterOrder_;  // LRU order (front = oldest)
    std::string activeChapterId_;
    static constexpr size_t kMaxChapters = 5;

    ChapterState& getOrCreateChapter(const std::string& chapterId);
    const ChapterState* findChapter(const std::string& chapterId) const;
    void touchChapter(const std::string& chapterId);
    void evictIfNeeded();
    void updateInteractionCache(const std::string& chapterId, const LayoutResult& result);
};

} // namespace typesetting
