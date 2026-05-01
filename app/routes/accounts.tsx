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
  LuCreditCard,
  LuFileText,
  LuPencil,
  LuPlus,
  LuSearch,
  LuSlidersHorizontal,
  LuStore,
  LuUserRound,
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
import { CONTRACT_ACCOUNTS } from "~/data/mockData";

import type {
  Column,
  ColumnDef,
  ColumnPinningState,
  PaginationState,
} from "@tanstack/react-table";
import type { CSSProperties, ReactNode } from "react";
import type { IconType } from "react-icons";
import type {
  ContractAccount,
  ContractAccountStatus,
  ContractAccountType,
  ContractBillingCycle,
  ContractPaymentTerm,
} from "~/data/mockData";

type StatusFilter = ContractAccountStatus | "All";
type PaginationItem = number | "ellipsis";
type ContractAccountFormValues = {
  accountNumber: string;
  accountName: string;
  merchantId: string;
  accountType: ContractAccountType;
  status: ContractAccountStatus;
  billingName: string;
  billingAddress: string;
  billingCity: string;
  billingRegion: string;
  taxId: string;
  picName: string;
  picPhone: string;
  picEmail: string;
  defaultServicePointId: string;
  paymentTerm: ContractPaymentTerm;
  billingCycle: ContractBillingCycle;
  contractOwner: string;
  effectiveDate: string;
};
type ContractLineLinkStatus = "Linked" | "Ready" | "Not Linked";
type ContractLineLink = {
  lineNumber: string;
  lineName: string;
  status: ContractLineLinkStatus;
};
type AccountRow = ContractAccount & {
  contractLine: ContractLineLink;
};

const PAGE_SIZE_OPTIONS = [5, 10, 15];
const statusFilters: StatusFilter[] = ["All", "Active", "Inactive"];
const accountTypes: ContractAccountType[] = [
  "Corporate",
  "Branch",
  "Aggregator",
];
const accountStatuses: ContractAccountStatus[] = ["Active", "Inactive"];
const accountContractLines: Record<string, ContractLineLink> = {
  "acct-indomaret-jabodetabek": {
    lineNumber: "CL-2026-0001",
    lineName: "Monthly rental - Jabodetabek",
    status: "Linked",
  },
  "acct-bca-enterprise": {
    lineNumber: "CL-2026-0007",
    lineName: "Enterprise EDC bundle",
    status: "Ready",
  },
  "acct-hypermart-west-java": {
    lineNumber: "CL-2026-0011",
    lineName: "West Java branch rollout",
    status: "Linked",
  },
  "acct-kopi-braga-review": {
    lineNumber: "-",
    lineName: "Not linked",
    status: "Not Linked",
  },
  "acct-tunjungan-plaza": {
    lineNumber: "CL-2026-0009",
    lineName: "Retail estate renewal",
    status: "Linked",
  },
};

export function meta() {
  return [
    { title: "Accounts | EDC.OS" },
    {
      name: "description",
      content: "Account master data for billing and contract line mapping.",
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

function getPinnedColumnStyles(column: Column<AccountRow>): CSSProperties {
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
        data-testid="account-page-size"
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

function StatusBadge({ status }: { status: ContractAccountStatus }) {
  const variantMap: Record<
    ContractAccountStatus,
    "success" | "secondary"
  > = {
    Active: "success",
    Inactive: "secondary",
  };

  return (
    <Badge variant={variantMap[status]} className="min-w-28 justify-center">
      {status}
    </Badge>
  );
}

function ContractLineBadge({ status }: { status: ContractLineLinkStatus }) {
  const variantMap: Record<
    ContractLineLinkStatus,
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

function FormSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: IconType;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-background/45 p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-accent">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </span>
        {title}
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function getNextAccountNumber(accounts: ContractAccount[]) {
  const year = new Date().getFullYear();
  const nextSequence =
    accounts.reduce((highest, account) => {
      const match = account.accountNumber.match(/^ACC-(\d{4})-(\d+)$/);

      if (!match || Number(match[1]) !== year) return highest;

      return Math.max(highest, Number(match[2]));
    }, 0) + 1;

  return `ACC-${year}-${String(nextSequence).padStart(4, "0")}`;
}

function getAccountId(
  accountNumber: string,
  accountName: string,
  existingIds: Set<string>,
) {
  const slug = (accountNumber || accountName)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const baseId = `acct-${slug || Date.now()}`;

  if (!existingIds.has(baseId)) return baseId;

  let index = existingIds.size + 1;
  let nextId = `${baseId}-${index}`;

  while (existingIds.has(nextId)) {
    index += 1;
    nextId = `${baseId}-${index}`;
  }

  return nextId;
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getContractAccountFormValues(
  account: ContractAccount | undefined,
  generatedAccountNumber: string,
): ContractAccountFormValues {
  return {
    accountNumber: account?.accountNumber ?? generatedAccountNumber,
    accountName: account?.accountName ?? "",
    merchantId: account?.merchantId ?? "",
    accountType: account?.accountType ?? "Corporate",
    status: account?.status ?? "Active",
    billingName: account?.billingName ?? "",
    billingAddress: account?.billingAddress ?? "",
    billingCity: account?.billingCity ?? "",
    billingRegion: account?.billingRegion ?? "",
    taxId: account?.taxId ?? "",
    picName: account?.picName ?? "",
    picPhone: account?.picPhone ?? "",
    picEmail: account?.picEmail ?? "",
    defaultServicePointId: account?.defaultServicePointId ?? "",
    paymentTerm: account?.paymentTerm ?? "Net 30",
    billingCycle: account?.billingCycle ?? "Monthly",
    contractOwner: account?.contractOwner ?? "Unassigned",
    effectiveDate: account?.effectiveDate ?? getTodayDate(),
  };
}

function ContractAccountDialog({
  mode,
  account,
  generatedAccountNumber,
  open,
  onClose,
  onSave,
}: {
  mode: "create" | "update";
  account?: ContractAccount;
  generatedAccountNumber: string;
  open: boolean;
  onClose: () => void;
  onSave: (account: ContractAccount) => void;
}) {
  const form = useForm({
    defaultValues: getContractAccountFormValues(account, generatedAccountNumber),
    onSubmit: ({ value }) => {
      onSave({
        id: account?.id ?? "",
        accountNumber: value.accountNumber,
        accountName: value.accountName.trim(),
        merchantId: value.merchantId,
        accountType: value.accountType,
        status: value.status,
        billingName: value.billingName.trim(),
        billingAddress: value.billingAddress.trim(),
        billingCity: value.billingCity.trim(),
        billingRegion: value.billingRegion.trim(),
        taxId: value.taxId.trim(),
        picName: value.picName.trim(),
        picPhone: value.picPhone.trim(),
        picEmail: value.picEmail.trim(),
        defaultServicePointId: value.defaultServicePointId,
        paymentTerm: value.paymentTerm,
        billingCycle: value.billingCycle,
        contractOwner: value.contractOwner.trim(),
        effectiveDate: value.effectiveDate,
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}>
      <DialogContent className="max-h-[min(48rem,calc(100vh-2rem))] max-w-5xl">
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
              Account
            </p>
            <DialogTitle>
              {mode === "create" ? "Add Account" : "Update Account"}
            </DialogTitle>
            <DialogDescription>
              Maintain account and billing data.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 overflow-y-auto p-5">
            <FormSection title="Identity" icon={LuStore}>
              <div className="grid gap-4 sm:grid-cols-[11rem_minmax(0,1fr)]">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold text-foreground/65">
                    Account ID
                  </span>
                  <form.Field name="accountNumber">
                    {(field) => (
                      <Input
                        value={field.state.value}
                        readOnly
                        className="bg-white font-bold text-accent"
                        data-testid="account-number-input"
                      />
                    )}
                  </form.Field>
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-semibold text-foreground/65">
                    Account name
                  </span>
                  <form.Field name="accountName">
                    {(field) => (
                      <Input
                        value={field.state.value}
                        onChange={(event) => field.handleChange(event.target.value)}
                        placeholder="Indomaret Jabodetabek Master"
                        data-testid="account-name-input"
                      />
                    )}
                  </form.Field>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold text-foreground/65">
                    Account type
                  </span>
                  <form.Field name="accountType">
                    {(field) => (
                      <Select
                        value={field.state.value}
                        onChange={(event) =>
                          field.handleChange(event.target.value as ContractAccountType)
                        }
                        data-testid="account-type-select"
                      >
                        {accountTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </Select>
                    )}
                  </form.Field>
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-semibold text-foreground/65">
                    Status
                  </span>
                  <form.Field name="status">
                    {(field) => (
                      <Select
                        value={field.state.value}
                        onChange={(event) =>
                          field.handleChange(event.target.value as ContractAccountStatus)
                        }
                        data-testid="account-status-select"
                      >
                        {accountStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </Select>
                    )}
                  </form.Field>
                </label>
              </div>
            </FormSection>

            <FormSection title="Billing" icon={LuCreditCard}>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold text-foreground/65">
                    Billing name
                  </span>
                  <form.Field name="billingName">
                    {(field) => (
                      <Input
                        value={field.state.value}
                        onChange={(event) => field.handleChange(event.target.value)}
                        placeholder="PT Customer Name"
                        data-testid="account-billing-name-input"
                      />
                    )}
                  </form.Field>
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-semibold text-foreground/65">
                    Tax ID / NPWP
                  </span>
                  <form.Field name="taxId">
                    {(field) => (
                      <Input
                        value={field.state.value}
                        onChange={(event) => field.handleChange(event.target.value)}
                        placeholder="00.000.000.0-000.000"
                        data-testid="account-tax-id-input"
                      />
                    )}
                  </form.Field>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem_14rem]">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold text-foreground/65">
                    Billing address
                  </span>
                  <form.Field name="billingAddress">
                    {(field) => (
                      <Input
                        value={field.state.value}
                        onChange={(event) => field.handleChange(event.target.value)}
                        placeholder="Street address"
                        data-testid="account-billing-address-input"
                      />
                    )}
                  </form.Field>
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-semibold text-foreground/65">
                    City
                  </span>
                  <form.Field name="billingCity">
                    {(field) => (
                      <Input
                        value={field.state.value}
                        onChange={(event) => field.handleChange(event.target.value)}
                        placeholder="Jakarta"
                        data-testid="account-billing-city-input"
                      />
                    )}
                  </form.Field>
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-semibold text-foreground/65">
                    Region
                  </span>
                  <form.Field name="billingRegion">
                    {(field) => (
                      <Input
                        value={field.state.value}
                        onChange={(event) => field.handleChange(event.target.value)}
                        placeholder="Jabodetabek North"
                        data-testid="account-billing-region-input"
                      />
                    )}
                  </form.Field>
                </label>
              </div>
            </FormSection>

            <FormSection title="PIC Contact" icon={LuUserRound}>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold text-foreground/65">
                    PIC name
                  </span>
                  <form.Field name="picName">
                    {(field) => (
                      <Input
                        value={field.state.value}
                        onChange={(event) => field.handleChange(event.target.value)}
                        placeholder="Contact name"
                        data-testid="account-pic-name-input"
                      />
                    )}
                  </form.Field>
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-semibold text-foreground/65">
                    PIC phone
                  </span>
                  <form.Field name="picPhone">
                    {(field) => (
                      <Input
                        value={field.state.value}
                        onChange={(event) => field.handleChange(event.target.value)}
                        placeholder="+62 ..."
                        data-testid="account-pic-phone-input"
                      />
                    )}
                  </form.Field>
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-semibold text-foreground/65">
                    PIC email
                  </span>
                  <form.Field name="picEmail">
                    {(field) => (
                      <Input
                        value={field.state.value}
                        onChange={(event) => field.handleChange(event.target.value)}
                        placeholder="name@account.co.id"
                        type="email"
                        data-testid="account-pic-email-input"
                      />
                    )}
                  </form.Field>
                </label>
              </div>
            </FormSection>
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
                    !values.accountName.trim() ||
                    !values.status ||
                    !values.billingName.trim() ||
                    !values.billingAddress.trim() ||
                    !values.picName.trim() ||
                    !values.picPhone.trim() ||
                    !values.picEmail.trim()
                  }
                  data-testid="save-account-button"
                >
                  {mode === "create" ? "Add Account" : "Save Changes"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Accounts() {
  const [accounts, setAccounts] = useState<ContractAccount[]>(CONTRACT_ACCOUNTS);
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
  const [selectedAccount, setSelectedAccount] =
    useState<ContractAccount | null>(null);

  const generatedAccountNumber = useMemo(
    () => getNextAccountNumber(accounts),
    [accounts],
  );
  const tableData = useMemo<AccountRow[]>(
    () =>
      accounts
        .filter((account) =>
          statusFilter === "All" ? true : account.status === statusFilter,
        )
        .map((account) => ({
          ...account,
          contractLine: accountContractLines[account.id] ?? {
            lineNumber: "-",
            lineName: "Not linked",
            status: "Not Linked",
          },
        })),
    [accounts, statusFilter],
  );

  const columns = useMemo<ColumnDef<AccountRow>[]>(
    () => [
      {
        id: "account",
        accessorFn: (row) => `${row.accountNumber} ${row.accountName}`,
        header: "Account",
        size: 280,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {row.original.accountName}
            </p>
            <p className="mt-1 truncate text-xs font-bold text-accent">
              {row.original.accountNumber}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "accountType",
        id: "accountType",
        header: "Type",
        size: 140,
      },
      {
        accessorKey: "status",
        id: "status",
        header: "Status",
        size: 160,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "billing",
        accessorFn: (row) =>
          `${row.billingName} ${row.billingAddress} ${row.billingCity} ${row.billingRegion} ${row.taxId}`,
        header: "Billing",
        size: 300,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {row.original.billingName}
            </p>
            <p className="mt-1 truncate text-xs text-foreground/55">
              {row.original.billingCity} - {row.original.billingRegion}
            </p>
          </div>
        ),
      },
      {
        id: "contractLine",
        accessorFn: (row) =>
          `${row.contractLine.lineNumber} ${row.contractLine.lineName} ${row.contractLine.status}`,
        header: "Contract Line",
        size: 280,
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-foreground">
                {row.original.contractLine.lineName}
              </p>
              <p className="mt-1 truncate text-xs text-foreground/55">
                {row.original.contractLine.lineNumber}
              </p>
            </div>
            <ContractLineBadge status={row.original.contractLine.status} />
          </div>
        ),
      },
      {
        id: "pic",
        accessorFn: (row) =>
          `${row.picName} ${row.picPhone} ${row.picEmail}`,
        header: "PIC Contact",
        size: 260,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {row.original.picName}
            </p>
            <p className="mt-1 truncate text-xs text-foreground/55">
              {row.original.picPhone}
              {row.original.picEmail ? ` - ${row.original.picEmail}` : ""}
            </p>
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
            onClick={() => setSelectedAccount(row.original)}
            size="sm"
            aria-label={`Update ${row.original.accountName}`}
            data-testid={`update-account-${row.original.id}`}
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
  const activeAccounts = accounts.filter(
    (account) => account.status === "Active",
  ).length;
  const inactiveAccounts = accounts.filter(
    (account) => account.status === "Inactive",
  ).length;
  const linkedLines = tableData.filter(
    (account) => account.contractLine.status === "Linked",
  ).length;

  const createAccount = (account: ContractAccount) => {
    const id = getAccountId(
      account.accountNumber,
      account.accountName,
      new Set(accounts.map((item) => item.id)),
    );

    setAccounts((current) => [...current, { ...account, id }]);
    setCreateOpen(false);
  };

  const updateAccount = (account: ContractAccount) => {
    if (!selectedAccount) return;

    setAccounts((current) =>
      current.map((item) =>
        item.id === selectedAccount.id
          ? {
              ...item,
              ...account,
              id: selectedAccount.id,
              accountNumber: selectedAccount.accountNumber,
            }
          : item,
      ),
    );
    setSelectedAccount(null);
  };

  return (
    <div className="animate-fade-up space-y-6" data-testid="accounts-page">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Accounts
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Accounts
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-foreground/60">
            Create and maintain account records. Contract line mapping is shown
            in the list for visibility.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:min-w-[38rem]">
          <MetricTile label="Accounts" value={accounts.length} icon={LuStore} />
          <MetricTile
            label="Active"
            value={activeAccounts}
            icon={LuBadgeCheck}
            tone="good"
          />
          <MetricTile
            label="Inactive"
            value={inactiveAccounts}
            icon={LuCreditCard}
            tone={inactiveAccounts ? "warning" : "default"}
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
                Account List
              </h2>
              <p className="text-xs text-foreground/60">
                Showing {filteredRows} matching rows
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative block min-w-0 sm:w-80">
              <span className="sr-only">Search accounts</span>
              <LuSearch
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent"
                strokeWidth={1.75}
              />
              <Input
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                placeholder="Search account, billing, PIC..."
                className="pl-9"
                data-testid="account-search-input"
              />
            </label>

            <label className="relative block min-w-0 sm:w-48">
              <LuSlidersHorizontal
                className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-accent"
                strokeWidth={1.75}
              />
              <span className="sr-only">Filter account status</span>
              <Select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as StatusFilter);
                  table.setPageIndex(0);
                }}
                className="w-full pl-9"
                data-testid="account-status-filter"
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
              data-testid="create-account-button"
            >
              <LuPlus className="h-4 w-4" strokeWidth={1.75} />
              Add Account
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
                    No accounts match your filters.
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
        <ContractAccountDialog
          mode="create"
          generatedAccountNumber={generatedAccountNumber}
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSave={createAccount}
        />
      ) : null}

      {selectedAccount ? (
        <ContractAccountDialog
          key={selectedAccount.id}
          mode="update"
          account={selectedAccount}
          generatedAccountNumber={selectedAccount.accountNumber}
          open={Boolean(selectedAccount)}
          onClose={() => setSelectedAccount(null)}
          onSave={updateAccount}
        />
      ) : null}
    </div>
  );
}
