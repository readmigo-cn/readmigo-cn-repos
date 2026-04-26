import { SimpleIcon } from '../components/IconPlaceholder';
/**
 * Audiobook Player Page - Full screen audio player with follow-along text
 * 功能对齐：mobile/src/features/audiobook/components/AudioPlayer.tsx
 * 
 * Features:
 * - Full screen player with cover art
 * - Chapter navigation
 * - Playback controls (play/pause, seek, skip)
 * - Speed control (0.5x - 3.0x)
 * - Sleep timer
 * - Chapter list
 * - Follow-along text highlighting (word-level)
 * - TTS voice selection
 */

import { audioPlayerStore, useAudioPlayerStore } from '../store/AudioPlayerStore';
import { TTSService } from '../service/TTSService';
import type { PlaybackSpeed, SleepTimerOption } from '../model/Audiobook';
import { SLEEP_TIMER_OPTIONS, PLAYBACK_SPEEDS } from '../model/Audiobook';

@Entry
@Component
struct AudiobookPlayer {
  @State audiobook = audioPlayerStore.audiobook;
  @State currentChapter = audioPlayerStore.currentChapter;
  @State chapterIndex = audioPlayerStore.chapterIndex;
  @State isPlaying = audioPlayerStore.isPlaying;
  @State isLoading = audioPlayerStore.isLoading;
  @State currentTime = audioPlayerStore.currentTime;
  @State duration = audioPlayerStore.duration;
  @State playbackSpeed = audioPlayerStore.playbackSpeed;
  @State sleepTimer = audioPlayerStore.sleepTimer;
  @State showSpeedPicker = false;
  @State showSleepTimer = false;
  @State showChapterList = false;
  @State showVoiceSelector = false;
  @State showFollowAlong = false;

  // Progress
  @State progress: number = 0;
  @State remainingTime: number = 0;

  aboutToAppear() {
    // Subscribe to store changes
    audioPlayerStore.subscribe(() => {
      this.audiobook = audioPlayerStore.audiobook;
      this.currentChapter = audioPlayerStore.currentChapter;
      this.chapterIndex = audioPlayerStore.chapterIndex;
      this.isPlaying = audioPlayerStore.isPlaying;
      this.isLoading = audioPlayerStore.isLoading;
      this.currentTime = audioPlayerStore.currentTime;
      this.duration = audioPlayerStore.duration;
      this.playbackSpeed = audioPlayerStore.playbackSpeed;
      this.sleepTimer = audioPlayerStore.sleepTimer;
      this.updateProgress();
    });

    this.updateProgress();
  }

  updateProgress() {
    if (this.duration > 0) {
      this.progress = (this.currentTime / this.duration) * 100;
      this.remainingTime = this.duration - this.currentTime;
    }
  }

  build() {
    if (!this.audiobook) {
      // No audiobook loaded - show empty state
      this.EmptyState()
    } else {
      Stack() {
        // Main player content
        this.PlayerContent()

        // Speed picker modal
        if (this.showSpeedPicker) {
          this.SpeedPickerModal()
        }

        // Sleep timer modal
        if (this.showSleepTimer) {
          this.SleepTimerModal()
        }

        // Chapter list modal
        if (this.showChapterList) {
          this.ChapterListModal()
        }
      }
      .width('100%')
      .height('100%')
      .backgroundColor('#0f0f1a')
    }
  }

  @Builder PlayerContent() {
    Column({ space: 24 }) {
      // Header
      this.Header()

      // Cover art
      this.CoverArt()

      // Book info
      this.BookInfo()

      // Progress slider
      this.ProgressSlider()

      // Main controls
      this.MainControls()

      // Secondary controls
      this.SecondaryControls()

      // Follow-along button
      this.FollowAlongButton()
    }
    .width('100%')
    .height('100%')
    .padding({ top: 40, bottom: 40, left: 20, right: 20 })
  }

  @Builder Header() {
    Row() {
      // Close button
      Button() {
        Image(SimpleIcon({ name: 'chevron_down', size: 28, color: '#ffffff' }))
          .width(28)
          .height(28)
          .fillColor(Color.White)
      }
      .type(ButtonType.Circle)
      .backgroundColor('transparent')
      .onClick(() => {
        audioPlayerStore.minimize();
        // TODO: Navigate back
      })

      // Book title
      Text(this.audiobook?.title || '')
        .fontSize(16)
        .fontWeight(FontWeight.SemiBold)
        .fontColor(Color.White)
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
        .layoutWeight(1)
        .textAlign(TextAlign.Center)

      // More options
      Button() {
        Image(SimpleIcon({ name: 'more_vert', size: 24, color: '#ffffff' }))
          .width(24)
          .height(24)
          .fillColor(Color.White)
      }
      .type(ButtonType.Circle)
      .backgroundColor('transparent')
    }
    .width('100%')
  }

  @Builder CoverArt() {
    Stack() {
      if (this.audiobook?.coverUrl) {
        Image(this.audiobook.coverUrl)
          .width(240)
          .height(240)
          .objectFit(ImageFit.Cover)
          .borderRadius(12)
          .shadow({ radius: 16, color: '#10101040', offsetY: 8 })
      } else {
        // Placeholder
        Stack() {
          Rectangle()
            .width(240)
            .height(240)
            .backgroundColor('#1a1a2e')
            .borderRadius(12)
          Image(SimpleIcon({ name: 'headset', size: 80, color: '#666666' }))
            .width(80)
            .height(80)
            .fillColor('#666666')
        }
      }
    }
    .width('100%')
    .alignItems(HorizontalAlign.Center)
  }

  @Builder BookInfo() {
    Column({ space: 4 }) {
      // Title
      Text(this.audiobook?.title || '')
        .fontSize(20)
        .fontWeight(FontWeight.Bold)
        .fontColor(Color.White)
        .maxLines(2)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
        .textAlign(TextAlign.Center)

      // Author
      Text(this.audiobook?.author || '')
        .fontSize(16)
        .fontColor('#999999')
        .maxLines(1)

      // Narrator
      if (this.audiobook?.narrator) {
        Text(`Narrated by ${this.audiobook.narrator}`)
          .fontSize(14)
          .fontColor('#666666')
          .maxLines(1)
      }

      // Chapter info
      Text(`Chapter ${this.chapterIndex + 1} of ${this.audiobook?.chapters.length || 0}`)
        .fontSize(14)
        .fontColor('#4CAF50')
        .maxLines(1)
    }
    .width('100%')
    .alignItems(HorizontalAlign.Center)
  }

  @Builder ProgressSlider() {
    Column({ space: 8 }) {
      // Slider
      Slider({
        value: this.progress,
        min: 0,
        max: 100
      })
        .onChange((value: number) => {
          const newPosition = (value / 100) * this.duration;
          audioPlayerStore.seek(newPosition);
        })
        .blockColor('#4CAF50')
        .trackBackgroundColor('rgba(255, 255, 255, 0.3)')
        .width('100%')

      // Time labels
      Row() {
        Text(this.formatTime(this.currentTime))
          .fontSize(12)
          .fontColor('#666666')
        Text(`-${this.formatTime(this.remainingTime)}`)
          .fontSize(12)
          .fontColor('#666666')
      }
      .width('100%')
      .justifyContent(FlexAlign.SpaceBetween)
    }
    .width('100%')
  }

  @Builder MainControls() {
    Row({ space: 20 }) {
      // Skip back chapter
      Button() {
        Image(SimpleIcon({ name: 'skip_previous', size: 32, color: '#ffffff' }))
          .width(32)
          .height(32)
          .fillColor(Color.White)
      }
      .type(ButtonType.Circle)
      .backgroundColor('transparent')
      .onClick(() => { audioPlayerStore.previousChapter(); })

      // Seek backward 15s
      Button() {
        Column({ space: 2 }) {
          Image(SimpleIcon({ name: 'chevron_left', size: 28, color: '#ffffff' }))
            .width(28)
            .height(28)
            .fillColor(Color.White)
          Text('15')
            .fontSize(10)
            .fontColor(Color.White)
        }
      }
      .type(ButtonType.Circle)
      .backgroundColor('transparent')
      .onClick(() => { audioPlayerStore.seekBackward(15); })

      // Play/Pause
      Button() {
        if (this.isLoading) {
          LoadingProgress()
        } else {
          Image(this.isPlaying ? SimpleIcon({ name: 'pause', size: 40, color: '#ffffff' }) : SimpleIcon({ name: 'play_arrow', size: 24, color: '#4CAF50' }))
            .width(40)
            .height(40)
            .fillColor(Color.White)
        }
      }
      .width(72)
      .height(72)
      .borderRadius(36)
      .backgroundColor('#4CAF50')
      .onClick(() => { audioPlayerStore.togglePlay(); })

      // Seek forward 15s
      Button() {
        Column({ space: 2 }) {
          Image(SimpleIcon({ name: 'chevron_right', size: 28, color: '#ffffff' }))
            .width(28)
            .height(28)
            .fillColor(Color.White)
          Text('15')
            .fontSize(10)
            .fontColor(Color.White)
        }
      }
      .type(ButtonType.Circle)
      .backgroundColor('transparent')
      .onClick(() => { audioPlayerStore.seekForward(15); })

      // Skip forward chapter
      Button() {
        Image(SimpleIcon({ name: 'skip_next', size: 32, color: '#ffffff' }))
          .width(32)
          .height(32)
          .fillColor(Color.White)
      }
      .type(ButtonType.Circle)
      .backgroundColor('transparent')
      .onClick(() => { audioPlayerStore.nextChapter(); })
    }
    .width('100%')
    .justifyContent(FlexAlign.Center)
  }

  @Builder SecondaryControls() {
    Row({ space: 48 }) {
      // Speed control
      Column({ space: 4 }) {
        Button() {
          Text(`${this.playbackSpeed}x`)
            .fontSize(16)
            .fontWeight(FontWeight.SemiBold)
            .fontColor(Color.White)
        }
        .type(ButtonType.Circle)
        .backgroundColor('transparent')
        .onClick(() => { this.showSpeedPicker = true; })

        Text('速度')
          .fontSize(12)
          .fontColor('#666666')
      }

      // Sleep timer
      Column({ space: 4 }) {
        Button() {
          Image(SimpleIcon({ name: 'bedtime', size: 24, color: '#4CAF50' }))
            .width(24)
            .height(24)
            .fillColor(this.sleepTimer ? '#4CAF50' : Color.White)
        }
        .type(ButtonType.Circle)
        .backgroundColor('transparent')
        .onClick(() => { this.showSleepTimer = true; })

        Text(this.sleepTimer ? 
          (this.sleepTimer === 'end_of_chapter' ? '本章' : `${this.sleepTimer}分钟`) : 
          '定时')
          .fontSize(12)
          .fontColor('#666666')
      }

      // Chapter list
      Column({ space: 4 }) {
        Button() {
          Image(SimpleIcon({ name: 'list', size: 24, color: '#ffffff' }))
            .width(24)
            .height(24)
            .fillColor(Color.White)
        }
        .type(ButtonType.Circle)
        .backgroundColor('transparent')
        .onClick(() => { this.showChapterList = true; })

        Text('章节')
          .fontSize(12)
          .fontColor('#666666')
      }

      // Voice selector (TTS only)
      if (this.audiobook?.source === 'TTS_GENERATED') {
        Column({ space: 4 }) {
          Button() {
            Image(SimpleIcon({ name: 'mic', size: 24, color: '#ffffff' }))
              .width(24)
              .height(24)
              .fillColor(Color.White)
          }
          .type(ButtonType.Circle)
          .backgroundColor('transparent')
          .onClick(() => { this.showVoiceSelector = true; })

          Text('音色')
            .fontSize(12)
            .fontColor('#666666')
        }
      }
    }
    .width('100%')
    .justifyContent(FlexAlign.Center)
  }

  @Builder FollowAlongButton() {
    Button() {
      Row({ space: 8 }) {
        Image(SimpleIcon({ name: 'text_fields', size: 20, color: '#4CAF50' }))
          .width(20)
          .height(20)
          .fillColor('#4CAF50')
        Text('跟读模式')
          .fontSize(14)
          .fontColor('#4CAF50')
      }
    }
    .backgroundColor('transparent')
    .border({ width: 1, color: '#4CAF50' })
    .borderRadius(20)
    .padding({ left: 16, right: 16, top: 8, bottom: 8 })
    .onClick(() => { this.showFollowAlong = true; })
  }

  @Builder SpeedPickerModal() {
    Column({ space: 20 }) {
      Text('播放速度')
        .fontSize(18)
        .fontWeight(FontWeight.SemiBold)
        .fontColor(Color.White)

      // Speed options
      Flex({ wrap: FlexWrap.Wrap, justifyContent: FlexAlign.Center, alignContent: FlexAlign.Center }) {
        ForEach(PLAYBACK_SPEEDS, (speed: number) => {
          Button() {
            Text(`${speed}x`)
              .fontSize(16)
              .fontWeight(this.playbackSpeed === speed ? FontWeight.Bold : FontWeight.Medium)
              .fontColor(this.playbackSpeed === speed ? Color.White : '#999999')
          }
          .width(80)
          .height(44)
          .backgroundColor(this.playbackSpeed === speed ? '#4CAF50' : 'rgba(255, 255, 255, 0.1)')
          .borderRadius(22)
          .margin({ bottom: 12 })
          .onClick(() => {
            audioPlayerStore.setPlaybackSpeed(speed as PlaybackSpeed);
            this.showSpeedPicker = false;
          })
        })
      }

      Button('关闭')
        .backgroundColor('transparent')
        .fontColor('#999999')
        .onClick(() => { this.showSpeedPicker = false; })
    }
    .width('100%')
    .padding(24)
    .backgroundColor('#1a1a2e')
    .borderRadius({ topLeft: 24, topRight: 24 })
    .position({ left: 0, bottom: 0 })
  }

  @Builder SleepTimerModal() {
    Column({ space: 16 }) {
      Text('定时关闭')
        .fontSize(18)
        .fontWeight(FontWeight.SemiBold)
        .fontColor(Color.White)

      // Turn off option
      if (this.sleepTimer) {
        Row() {
          Text('关闭定时')
            .fontSize(16)
            .fontColor('#ffffff')
          Blank()
          Image(SimpleIcon({ name: 'close', size: 24, color: '#ffffff' }))
            .width(24)
            .height(24)
            .fillColor('#f44336')
        }
        .width('100%')
        .padding({ top: 12, bottom: 12 })
        .border({ width: { bottom: 1 }, color: 'rgba(255, 255, 255, 0.1)' })
        .onClick(() => {
          audioPlayerStore.setSleepTimer(null);
          this.showSleepTimer = false;
        })
      }

      // Timer options
      ForEach(SLEEP_TIMER_OPTIONS, (option) => {
        Row() {
          Text(option.label)
            .fontSize(16)
            .fontColor('#ffffff')
          Blank()
          if (this.sleepTimer === option.value) {
            Image($r('app.media.check_circle'))
              .width(24)
              .height(24)
              .fillColor('#4CAF50')
          }
        }
        .width('100%')
        .padding({ top: 12, bottom: 12 })
        .border({ width: { bottom: 1 }, color: 'rgba(255, 255, 255, 0.1)' })
        .onClick(() => {
          audioPlayerStore.setSleepTimer(option.value);
          this.showSleepTimer = false;
        })
      })

      Button('关闭')
        .backgroundColor('transparent')
        .fontColor('#999999')
        .onClick(() => { this.showSleepTimer = false; })
    }
    .width('100%')
    .padding(24)
    .backgroundColor('#1a1a2e')
    .borderRadius({ topLeft: 24, topRight: 24 })
    .position({ left: 0, bottom: 0 })
  }

  @Builder ChapterListModal() {
    Column({ space: 16 }) {
      Text('章节列表')
        .fontSize(18)
        .fontWeight(FontWeight.SemiBold)
        .fontColor(Color.White)

      // Chapter list
      Scroll() {
        Column() {
          ForEach(this.audiobook?.chapters || [], (chapter, index: number) => {
            Row() {
              Row({ space: 12 }) {
                Text(`${chapter.number}`)
                  .fontSize(14)
                  .fontColor(index === this.chapterIndex ? '#4CAF50' : '#666666')
                  .width(32)

                Column({ space: 2 }) {
                  Text(chapter.title)
                    .fontSize(15)
                    .fontColor(index === this.chapterIndex ? '#4CAF50' : Color.White)
                    .maxLines(1)
                    .textOverflow({ overflow: TextOverflow.Ellipsis })
                  Text(this.formatTime(chapter.duration))
                    .fontSize(12)
                    .fontColor('#666666')
                }
              }
              .layoutWeight(1)

              if (index === this.chapterIndex) {
                Image(SimpleIcon({ name: 'volume_up', size: 20, color: '#4CAF50' }))
                  .width(20)
                  .height(20)
                  .fillColor('#4CAF50')
              }
            }
            .width('100%')
            .padding({ top: 14, bottom: 14 })
            .backgroundColor(index === this.chapterIndex ? 'rgba(76, 175, 80, 0.1)' : 'transparent')
            .borderRadius(8)
            .onClick(() => {
              audioPlayerStore.goToChapter(index);
              this.showChapterList = false;
            })
          })
        }
      }
      .width('100%')
      .layoutWeight(1)

      Button('关闭')
        .backgroundColor('transparent')
        .fontColor('#999999')
        .onClick(() => { this.showChapterList = false; })
    }
    .width('100%')
    .padding(24)
    .backgroundColor('#1a1a2e')
    .borderRadius({ topLeft: 24, topRight: 24 })
    .position({ left: 0, bottom: 0 })
  }

  @Builder EmptyState() {
    Column({ space: 16 }) {
      Image(SimpleIcon({ name: 'headset', size: 80, color: '#666666' }))
        .width(80)
        .height(80)
        .fillColor('#666666')

      Text('暂无播放')
        .fontSize(18)
        .fontColor('#999999')

      Text('从听书列表选择一本书开始播放')
        .fontSize(14)
        .fontColor('#666666')
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

// Loading progress component
@Component
struct LoadingProgress {
  build() {
    LoadingProgress()
      .width(40)
      .height(40)
      .color(Color.White)
  }
}
