/**
 * components/index.ets — W6 通用组件统一导出
 *
 * 用法：
 *   import { AppButton, ToastManager, AppEmptyState } from '../components';
 */

// ─── W6-C6 / C8 / C9 反馈与状态 ──────────────────
export {
  AppToast,
  AppToastLayer,
  ToastManager,
  AppSnackbar,
  ToastType,
  ToastPosition,
  ToastAction,
  ToastOptions,
  ToastEntry,
  SnackbarOptions,
} from './Toast';

export {
  LoadingIndicator,
  AppSkeleton,
  AppLoadingScreen,
  LoadingSize,
  LoadingVariant,
  SkeletonVariant,
} from './Loading';

export {
  AppEmptyState,
  EmptyStateVariant,
  EmptyStateAction,
} from './EmptyState';

// ─── W6-X 表单 / 卡片 ────────────────────────────
export {
  AppButton,
  ButtonVariant,
  ButtonSize,
  ButtonShape,
} from './Button';

export {
  AppInput,
  AppTextArea,
  InputSize,
  InputType,
} from './Input';

export {
  AppCard,
  CardHeader,
  CardBody,
  CardFooter,
  CardMedia,
  CardVariant,
  CardPadding,
} from './Card';

// ─── W6-Y 列表 / 弹窗 / Tab ──────────────────────
export {
  AppList,
  AppListItem,
  AppListDataSource,
  ListItemVariant,
  ListItemDivider,
  ListItemData,
  ListGroupData,
} from './List';

export {
  AppModal,
  AppSheet,
  AppDialog,
  ModalManager,
  ModalSize,
  DialogVariant,
  ModalResult,
  ModalOptions,
} from './Modal';

export {
  AppTabs,
  AppTabBar,
  AppTab,
  TabsVariant,
  TabIndicator,
  TabBarItem,
} from './Tab';

// ─── W7-C5 章节目录 ──────────────────────────────
export {
  ChapterTocSheet,
} from './ChapterTocSheet';

// ─── W8 双语对照 / 笔记编辑 ──────────────────────
export {
  BilingualReader,
  BilingualMode,
} from './BilingualReader';

export {
  NoteEditorSheet,
} from './NoteEditorSheet';
