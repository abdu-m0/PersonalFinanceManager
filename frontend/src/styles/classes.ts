export const layoutClasses = {
  shell: "min-h-screen bg-slate-100 text-slate-800 flex",
  sidebar: "bg-white border-r border-slate-200 w-64 flex-shrink-0 flex flex-col p-4 transition-all duration-300 ease-in-out",
  sidebarCollapsed: "lg:w-20",
  sidebarNav: "flex flex-col gap-2",
  sidebarLink: "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors",
  sidebarLinkActive: "bg-blue-50 text-blue-600 font-semibold",
  navLink: "px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900",
  navLinkActive: "bg-slate-100 text-slate-900",
  main: "flex-1 flex flex-col overflow-hidden",
  mainContent: "flex-1 overflow-y-auto p-6 lg:p-8 space-y-6"
} as const;

export const buttonClasses = {
  primary: "inline-block bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-700 shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-lg active:scale-95",
  secondary: "inline-block bg-white border border-slate-300 rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md active:scale-95",
  tertiary: "text-sm font-medium text-blue-600 hover:text-blue-800",
  danger: "inline-block bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-red-700 shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-lg active:scale-95"
} as const;

export const surfaceClasses = {
  card: "bg-white rounded-2xl p-6 shadow-lg",
  sectionTitle: "text-xl font-bold text-slate-900",
  mutedText: "text-sm text-slate-500"
} as const;

const baseInputStyles = "block w-full bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

export const formClasses = {
  gridTwo: "grid gap-6 md:grid-cols-2",
  gridAuto: "grid gap-6 md:grid-cols-2 lg:grid-cols-3",
  group: "flex flex-col gap-1.5",
  label: "text-sm font-medium text-slate-700",
  input: `${baseInputStyles} px-3 py-2`,
  textarea: `${baseInputStyles} px-3 py-2`,
  select: `${baseInputStyles} pl-3 pr-10 py-2 appearance-none bg-no-repeat bg-right-2 bg-[url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'%3e%3cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd' /%3e%3c/svg%3e")]`,
  helper: "text-xs text-slate-500"
} as const;
