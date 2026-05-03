#!/usr/bin/env bash
# generate-screenshots.sh — 米果智读 HarmonyOS 截图自动化
#
# 用 hdc shell screencap 在真机/模拟器抓取 10 张应用截图。
# 流程：列出设备 → 选择目标 → 启动 demo mode → 走 happy path → 逐页截图保存。
#
# 输出目录：apps/harmony-app/marketing/screenshots/{harmony,ios-cn}/{1-10}.png
# 中英双语：先以 zh-Hans 跑一遍，再切换到 en-US 重跑一遍。
#
# 用法：
#   ./generate-screenshots.sh                # 自动选择第一台设备 + zh-Hans
#   ./generate-screenshots.sh --device <SN>  # 指定设备
#   ./generate-screenshots.sh --locale en    # 指定语言
#   ./generate-screenshots.sh --target ios-cn  # 切换输出目录（iOS 用 simctl 时使用）

set -euo pipefail

# ---------- 配置 ----------
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUTPUT_BASE="${PROJECT_ROOT}/marketing/screenshots"
BUNDLE_ID="cn.readmigo.harmony"
ABILITY_NAME="EntryAbility"
SCREEN_DELAY="${SCREEN_DELAY:-2}"   # 每步截图前等待秒数
DEMO_MODE_FLAG="--demo-mode"

DEVICE_SN=""
LOCALE="zh-Hans"
TARGET="harmony"

# ---------- 解析参数 ----------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --device) DEVICE_SN="$2"; shift 2 ;;
    --locale) LOCALE="$2"; shift 2 ;;
    --target) TARGET="$2"; shift 2 ;;
    -h|--help)
      grep -E '^#' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "未知参数: $1" >&2; exit 1 ;;
  esac
done

OUTPUT_DIR="${OUTPUT_BASE}/${TARGET}"
mkdir -p "${OUTPUT_DIR}"

# ---------- 检查 hdc ----------
if ! command -v hdc >/dev/null 2>&1; then
  echo "错误：未找到 hdc。请安装 HarmonyOS DevEco Studio 并把 hdc 加入 PATH。" >&2
  exit 1
fi

# ---------- 选择设备 ----------
if [[ -z "${DEVICE_SN}" ]]; then
  DEVICE_LIST=$(hdc list targets | grep -v '^\s*$' || true)
  if [[ -z "${DEVICE_LIST}" ]]; then
    echo "错误：未发现连接的 HarmonyOS 设备。请连接真机或启动模拟器。" >&2
    exit 1
  fi
  DEVICE_SN=$(echo "${DEVICE_LIST}" | head -n1 | awk '{print $1}')
  echo "自动选择设备: ${DEVICE_SN}"
fi

HDC="hdc -t ${DEVICE_SN}"

# ---------- 切换语言（重启应用使其生效） ----------
echo "切换 locale 至 ${LOCALE} ..."
${HDC} shell param set persist.global.locale "${LOCALE}" || true
${HDC} shell aa force-stop "${BUNDLE_ID}" || true
sleep 1

# ---------- 进入 demo mode 启动应用 ----------
echo "启动应用 ${BUNDLE_ID} (demo mode) ..."
${HDC} shell aa start -a "${ABILITY_NAME}" -b "${BUNDLE_ID}" --pi "demo=true" || true
sleep 4

# ---------- 截图函数 ----------
shoot() {
  local index="$1"
  local label="$2"
  local action="${3:-}"

  echo "  [${index}/10] ${label}"
  if [[ -n "${action}" ]]; then
    eval "${action}"
    sleep "${SCREEN_DELAY}"
  fi

  local remote="/data/local/tmp/screen_${index}.png"
  local local_file="${OUTPUT_DIR}/${index}-${LOCALE}.png"
  ${HDC} shell snapshot_display -f "${remote}" >/dev/null
  ${HDC} file recv "${remote}" "${local_file}" >/dev/null
  ${HDC} shell rm "${remote}" || true
}

# ---------- Happy Path：10 张截图 ----------
echo "开始走 happy path（${LOCALE}）..."

shoot 1 "Hero 启动页（logo + slogan）" \
  "${HDC} shell aa start -a ${ABILITY_NAME} -b ${BUNDLE_ID} --pi page=splash"
shoot 2 "书库浏览（中文界面）" \
  "${HDC} shell aa start -a ${ABILITY_NAME} -b ${BUNDLE_ID} --pi page=library"
shoot 3 "阅读器 + 翻页动画" \
  "${HDC} shell aa start -a ${ABILITY_NAME} -b ${BUNDLE_ID} --pi page=reader&book=demo_book_01"
shoot 4 "AI 划词解释" \
  "${HDC} shell aa start -a ${ABILITY_NAME} -b ${BUNDLE_ID} --pi page=reader&action=word_explain&word=resilience"
shoot 5 "TTS 朗读 + 句子高亮" \
  "${HDC} shell aa start -a ${ABILITY_NAME} -b ${BUNDLE_ID} --pi page=reader&action=tts_play"
shoot 6 "双语对照模式" \
  "${HDC} shell aa start -a ${ABILITY_NAME} -b ${BUNDLE_ID} --pi page=reader&action=bilingual"
shoot 7 "生词本 + SRS 复习" \
  "${HDC} shell aa start -a ${ABILITY_NAME} -b ${BUNDLE_ID} --pi page=vocab&tab=review"
shoot 8 "学习数据 dashboard" \
  "${HDC} shell aa start -a ${ABILITY_NAME} -b ${BUNDLE_ID} --pi page=stats"
shoot 9 "桌面卡片（今日一词）" \
  "${HDC} shell aa start -a ${ABILITY_NAME} -b ${BUNDLE_ID} --pi page=widget_preview"
shoot 10 "跨设备协同" \
  "${HDC} shell aa start -a ${ABILITY_NAME} -b ${BUNDLE_ID} --pi page=sync_demo"

echo ""
echo "完成！截图保存于: ${OUTPUT_DIR}"
echo ""

# ---------- 多设备/多语言提示 ----------
cat <<EOF
下一步建议：
  1. 切换设备类型（手机/平板/折叠屏）：
     ./generate-screenshots.sh --device <平板SN>
  2. 切换语言再跑一遍：
     ./generate-screenshots.sh --locale en-US
  3. iOS 中国区版本（需要 xcrun simctl 适配脚本）：
     ./generate-screenshots.sh --target ios-cn
EOF
