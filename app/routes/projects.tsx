import { useMemo, useState } from "react";
import { useForm } from "@tanstack/react-form";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  LuBadgeCheck,
  LuChevronLeft,
  LuChevronRight,
  LuChevronsLeft,
  LuChevronsRight,
  LuCircleDot,
  LuFileText,
  LuFolderKanban,
  LuPencil,
  LuPlus,
  LuSearch,
  LuSlidersHorizontal,
} from "react-icons/lu";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { PROJECTS } from "~/data/mockData";

import type {
  Column,
  ColumnDef,
  ColumnPinningState,
  PaginationState,
} from "@tanstack/react-table";
import type { CSSProperties, ReactNode } from "react";
import type { IconType } from "react-icons";
import type {
  Project,
  ProjectContractLineStatus,
  ProjectStatus,
} from "~/data/mockData";

type StatusFilter = ProjectStatus | "All";
type PaginationItem = number | "ellipsis";
type ProjectFormValues = {
  name: string;
  code: string;
  description: string;
  status: ProjectStatus;
};

const PAGE_SIZE_OPTIONS = [5, 10, 15];
const statusFilters: StatusFilter[] = ["All", "Active", "Inactive"];
const projectStatuses: ProjectStatus[] = ["Active", "Inactive"];

export function meta() {
  return [
    { title: "Projects | EDC.OS" },
    {
      name: "description",
      content: "Project master data with contract line visibility.",
    },
  ];
}

function getPaginationItems(
  pageCount: number,
  currentPage: number,
): PaginationItem[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pageSet = new Set<number>([1, pageCount, currentPage]);

  if (currentPage <= 4) {
    [2, 3, 4, 5].forEach((page) => pageSet.add(page));
  } else if (currentPage >= pageCount - 3) {
    [pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1].forEach(
      (page) => pageSet.add(page),
    );
  } else {
    [currentPage - 1, currentPage + 1].forEach((page) => pageSet.add(page));
  }

  const pages = Array.from(pageSet)
    .filter((page) => page >= 1 && page <= pageCount)
    .sort((a, b) => a - b);

  return pages.flatMap<PaginationItem>((page, index) => {
    const previousPage = pages[index - 1];

    if (previousPage && page - previousPage > 1) {
      return ["ellipsis", page];
    }

    return [page];
  });
}

function getPinnedColumnStyles(column: Column<Project>): CSSProperties {
  const isPinned = column.getIsPinned();
  const isFirstRightPinnedColumn =
    isPinned === "right" && column.getIsFirstColumn("right");

  return {
    background: isPinned ? "#fff" : undefined,
    boxShadow: isFirstRightPinnedColumn
      ? "4px 0 8px -6px rgba(14, 39, 72, 0.65) inset"
      : undefined,
    minWidth: column.columnDef.size,
    opacity: isPinned ? 0.98 : 1,
    position: isPinned ? "sticky" : "relative",
    right: isPinned === "right" ? `${column.getAfter("right")}px` : undefined,
    width: column.columnDef.size,
    zIndex: isPinned ? 10 : 0,
  };
}

function IconPageButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      variant="outline"
      size="icon"
    >
      {children}
    </Button>
  );
}

function RowsPerPageDropdown({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="relative block min-w-36">
      <LuSlidersHorizontal
        className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-accent"
        strokeWidth={1.75}
      />
      <span className="sr-only">Rows per page</span>
      <Select
        value={String(value)}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full pl-9"
        data-testid="project-page-size"
      >
        {PAGE_SIZE_OPTIONS.map((pageSize) => (
          <option key={pageSize} value={pageSize}>
            Rows {pageSize}
          </option>
        ))}
      </Select>
    </label>
  );
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const variantMap: Record<ProjectStatus, "success" | "secondary"> = {
    Active: "success",
    Inactive: "secondary",
  };

  return (
    <Badge variant={variantMap[status]} className="min-w-24 justify-center">
      {status}
    </Badge>
  );
}

function ContractLineBadge({ status }: { status: ProjectContractLineStatus }) {
  const variantMap: Record<
    ProjectContractLineStatus,
    "success" | "warning" | "secondary"
  > = {
    Linked: "success",
    Ready: "warning",
    "Not Linked": "secondary",
  };

  return (
    <Badge variant={variantMap[status]} className="min-w-24 justify-center">
      {status}
    </Badge>
  );
}

function MetricTile({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: IconType;
  tone?: "default" | "good" | "warning";
}) {
  const toneClass = {
    default: "text-foreground",
    good: "text-emerald-700",
    warning: "text-amber-700",
  }[tone];

  return (
    <Card className="min-w-0">
      <CardContent className="px-4 py-3">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/50">
          <Icon className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
          {label}
        </p>
        <p className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function getNextProjectCode(projects: Project[]) {
  const year = new Date().getFullYear();
  const nextSequence =
    projects.reduce((highest, project) => {
      const match = project.code.match(/^PRJ-(\d{4})-(\d+)$/);

      if (!match || Number(match[1]) !== year) return highest;

      return Math.max(highest, Number(match[2]));
    }, 0) + 1;

  return `PRJ-${year}-${String(nextSequence).padStart(4, "0")}`;
}

function getProjectId(code: string, name: string, existingIds: Set<string>) {
  const slug = (code || name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const baseId = `project-${slug || Date.now()}`;

  if (!existingIds.has(baseId)) return baseId;

  let index = existingIds.size + 1;
  let nextId = `${baseId}-${index}`;

  while (existingIds.has(nextId)) {
    index += 1;
    nextId = `${baseId}-${index}`;
  }

  return nextId;
}

function getProjectFormValues(
  project: Project | undefined,
  generatedCode: string,
): ProjectFormValues {
  return {
    name: project?.name ?? "",
    code: project?.code ?? generatedCode,
    description: project?.description ?? "",
    status: project?.status ?? "Active",
  };
}

function ProjectDialog({
  mode,
  project,
  generatedCode,
  open,
  onClose,
  onSave,
}: {
  mode: "create" | "update";
  project?: Project;
  generatedCode: string;
  open: boolean;
  onClose: () => void;
  onSave: (project: Project) => void;
}) {
  const form = useForm({
    defaultValues: getProjectFormValues(project, generatedCode),
    onSubmit: ({ value }) => {
      onSave({
        id: project?.id ?? "",
        name: value.name.trim(),
        code: value.code.trim(),
        description: value.description.trim(),
        status: value.status,
        contractLineNumber: project?.contractLineNumber ?? "-",
        contractLineName: project?.contractLineName ?? "Not linked",
        contractLineStatus: project?.contractLineStatus ?? "Not Linked",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}>
      <DialogContent className="max-h-[min(40rem,calc(100vh-2rem))] max-w-3xl">
        <form
          className="flex max-h-[inherit] flex-col overflow-hidden"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            form.handleSubmit();
          }}
        >
          <DialogHeader>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
              Project
            </p>
            <DialogTitle>
              {mode === "create" ? "Add Project" : "Update Project"}
            </DialogTitle>
            <DialogDescription>
              Create project records. Contract line mapping is shown in the list.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 overflow-y-auto p-5">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
              <label className="grid gap-2">
                <span className="text-xs font-semibold text-foreground/65">
                  Project name
                </span>
                <form.Field name="name">
                  {(field) => (
                    <Input
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
                      placeholder="Jabodetabek Terminal Rollout"
                      data-testid="project-name-input"
                    />
                  )}
                </form.Field>
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-semibold text-foreground/65">
                  Project code
                </span>
                <form.Field name="code">
                  {(field) => (
                    <Input
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
                      placeholder="PRJ-2026-0001"
                      data-testid="project-code-input"
                    />
                  )}
                </form.Field>
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-xs font-semibold text-foreground/65">
                Desc
              </span>
              <form.Field name="description">
                {(field) => (
                  <textarea
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Project description"
                    className="min-h-28 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-foreground/40 focus:border-accent focus-visible:ring-2 focus-visible:ring-ring"
                    data-testid="project-description-input"
                  />
                )}
              </form.Field>
            </label>

            <label className="grid gap-2 sm:max-w-xs">
              <span className="text-xs font-semibold text-foreground/65">
                Status
              </span>
              <form.Field name="status">
                {(field) => (
                  <Select
                    value={field.state.value}
                    onChange={(event) =>
                      field.handleChange(event.target.value as ProjectStatus)
                    }
                    data-testid="project-status-select"
                  >
                    {projectStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Select>
                )}
              </form.Field>
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <form.Subscribe selector={(state) => state.values}>
              {(values) => (
                <Button
                  type="submit"
                  disabled={
                    !values.name.trim() ||
                    !values.code.trim() ||
                    !values.description.trim() ||
                    !values.status
                  }
                  data-testid="save-project-button"
                >
                  {mode === "create" ? "Add Project" : "Save Changes"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>(PROJECTS);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
    right: ["actions"],
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const generatedCode = useMemo(() => getNextProjectCode(projects), [projects]);
  const tableData = useMemo(
    () =>
      projects.filter((project) =>
        statusFilter === "All" ? true : project.status === statusFilter,
      ),
    [projects, statusFilter],
  );

  const columns = useMemo<ColumnDef<Project>[]>(
    () => [
      {
        id: "project",
        accessorFn: (row) => `${row.code} ${row.name}`,
        header: "Project",
        size: 280,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {row.original.name}
            </p>
            <p className="mt-1 truncate text-xs font-bold text-accent">
              {row.original.code}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "description",
        id: "description",
        header: "Desc",
        size: 360,
        cell: ({ row }) => (
          <p className="line-clamp-2 text-sm text-foreground/70">
            {row.original.description}
          </p>
        ),
      },
      {
        accessorKey: "status",
        id: "status",
        header: "Status",
        size: 140,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "contractLine",
        accessorFn: (row) =>
          `${row.contractLineNumber} ${row.contractLineName} ${row.contractLineStatus}`,
        header: "Contract Line",
        size: 300,
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-foreground">
                {row.original.contractLineName}
              </p>
              <p className="mt-1 truncate text-xs text-foreground/55">
                {row.original.contractLineNumber}
              </p>
            </div>
            <ContractLineBadge status={row.original.contractLineStatus} />
          </div>
        ),
      },
      {
        id: "actions",
        header: "Action",
        size: 140,
        enableGlobalFilter: false,
        enablePinning: true,
        cell: ({ row }) => (
          <Button
            onClick={() => setSelectedProject(row.original)}
            size="sm"
            aria-label={`Update ${row.original.name}`}
            data-testid={`update-project-${row.original.id}`}
          >
            <LuPencil className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
            Update
          </Button>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      columnPinning,
      globalFilter,
      pagination,
    },
    onColumnPinningChange: setColumnPinning,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const filteredRows = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex + 1;
  const paginationItems = useMemo(
    () => getPaginationItems(pageCount, currentPage),
    [currentPage, pageCount],
  );
  const activeProjects = projects.filter(
    (project) => project.status === "Active",
  ).length;
  const inactiveProjects = projects.filter(
    (project) => project.status === "Inactive",
  ).length;
  const linkedLines = projects.filter(
    (project) => project.contractLineStatus === "Linked",
  ).length;

  const createProject = (project: Project) => {
    const id = getProjectId(
      project.code,
      project.name,
      new Set(projects.map((item) => item.id)),
    );

    setProjects((current) => [...current, { ...project, id }]);
    setCreateOpen(false);
  };

  const updateProject = (project: Project) => {
    if (!selectedProject) return;

    setProjects((current) =>
      current.map((item) =>
        item.id === selectedProject.id
          ? {
              ...item,
              ...project,
              id: selectedProject.id,
            }
          : item,
      ),
    );
    setSelectedProject(null);
  };

  return (
    <div className="animate-fade-up space-y-6" data-testid="projects-page">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Projects
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Projects
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-foreground/60">
            Create project records and review which contract line each project
            is linked to from the list.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:min-w-[38rem]">
          <MetricTile label="Projects" value={projects.length} icon={LuFolderKanban} />
          <MetricTile
            label="Active"
            value={activeProjects}
            icon={LuBadgeCheck}
            tone="good"
          />
          <MetricTile
            label="Inactive"
            value={inactiveProjects}
            icon={LuFileText}
            tone={inactiveProjects ? "warning" : "default"}
          />
          <MetricTile
            label="Linked Lines"
            value={linkedLines}
            icon={LuFileText}
          />
        </div>
      </div>

      <section className="rounded-xl border border-border bg-white">
        <div className="flex flex-col gap-3 border-b border-border p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-accent">
              <LuCircleDot className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">
                Project List
              </h2>
              <p className="text-xs text-foreground/60">
                Showing {filteredRows} matching rows
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative block min-w-0 sm:w-80">
              <span className="sr-only">Search projects</span>
              <LuSearch
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent"
                strokeWidth={1.75}
              />
              <Input
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                placeholder="Search project, code, contract line..."
                className="pl-9"
                data-testid="project-search-input"
              />
            </label>

            <label className="relative block min-w-0 sm:w-48">
              <LuSlidersHorizontal
                className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-accent"
                strokeWidth={1.75}
              />
              <span className="sr-only">Filter project status</span>
              <Select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as StatusFilter);
                  table.setPageIndex(0);
                }}
                className="w-full pl-9"
                data-testid="project-status-filter"
              >
                {statusFilters.map((status) => (
                  <option key={status} value={status}>
                    {status === "All" ? "All Status" : status}
                  </option>
                ))}
              </Select>
            </label>

            <RowsPerPageDropdown
              value={table.getState().pagination.pageSize}
              onChange={(pageSize) => table.setPageSize(pageSize)}
            />
            <Button
              onClick={() => setCreateOpen(true)}
              data-testid="create-project-button"
            >
              <LuPlus className="h-4 w-4" strokeWidth={1.75} />
              Add Project
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table style={{ minWidth: table.getTotalSize() }}>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-background">
                  {headerGroup.headers.map((header) => {
                    const pinnedStyles = getPinnedColumnStyles(header.column);

                    return (
                      <TableHead
                        key={header.id}
                        style={{ ...pinnedStyles, background: "#F6F7F9" }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        style={getPinnedColumnStyles(cell.column)}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="px-4 py-12 text-center text-sm text-foreground/60"
                  >
                    No projects match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground/60">
            Page{" "}
            <span className="font-semibold text-foreground">
              {pageCount ? currentPage : 0}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-foreground">
              {pageCount || 0}
            </span>
          </p>

          <div className="flex max-w-full items-center gap-2 overflow-x-auto">
            <IconPageButton
              label="First page"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.setPageIndex(0)}
            >
              <LuChevronsLeft className="h-4 w-4" strokeWidth={1.75} />
            </IconPageButton>
            <IconPageButton
              label="Previous page"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              <LuChevronLeft className="h-4 w-4" strokeWidth={1.75} />
            </IconPageButton>
            <div
              className="flex items-center gap-1"
              aria-label="Pagination pages"
            >
              {paginationItems.map((item, index) =>
                item === "ellipsis" ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="flex h-9 w-9 items-center justify-center text-sm font-semibold text-foreground/40"
                  >
                    ...
                  </span>
                ) : (
                  <Button
                    key={item}
                    aria-current={item === currentPage ? "page" : undefined}
                    onClick={() => table.setPageIndex(item - 1)}
                    variant={item === currentPage ? "default" : "outline"}
                    size="icon"
                    className="min-w-9 px-3"
                  >
                    {item}
                  </Button>
                ),
              )}
            </div>
            <IconPageButton
              label="Next page"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              <LuChevronRight className="h-4 w-4" strokeWidth={1.75} />
            </IconPageButton>
            <IconPageButton
              label="Last page"
              disabled={!table.getCanNextPage()}
              onClick={() => table.setPageIndex(pageCount - 1)}
            >
              <LuChevronsRight className="h-4 w-4" strokeWidth={1.75} />
            </IconPageButton>
          </div>
        </div>
      </section>

      {createOpen ? (
        <ProjectDialog
          mode="create"
          generatedCode={generatedCode}
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSave={createProject}
        />
      ) : null}

      {selectedProject ? (
        <ProjectDialog
          key={selectedProject.id}
          mode="update"
          project={selectedProject}
          generatedCode={selectedProject.code}
          open={Boolean(selectedProject)}
          onClose={() => setSelectedProject(null)}
          onSave={updateProject}
        />
      ) : null}
    </div>
  );
}
