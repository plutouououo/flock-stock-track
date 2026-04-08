import { useState, useMemo } from "react";
import { DollarSign, Plus, Search, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useExpenses, useAddExpense, useUpdateExpense, useDeleteExpense } from "@/lib/queries";
import type { Expense } from "@/types";

export type ExpenseCategory = "utilities" | "supplies" | "maintenance" | "salaries" | "rent" | "marketing" | "other";

interface ExpenseFormValues {
  description: string;
  amount: string;
  category: ExpenseCategory;
  date: string;
  notes: string;
}

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "utilities", label: "Utilities" },
  { value: "supplies", label: "Supplies" },
  { value: "maintenance", label: "Maintenance" },
  { value: "salaries", label: "Salaries" },
  { value: "rent", label: "Rent" },
  { value: "marketing", label: "Marketing" },
  { value: "other", label: "Other" },
];

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toISOString().slice(0, 10);
}

function getCategoryLabel(category: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.value === category as ExpenseCategory)?.label || category;
}

export default function Expenses() {
  const { toast } = useToast();
  const { data: expenses = [], isLoading } = useExpenses();
  const addExpense = useAddExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | "all">("all");
  const [dateFilter, setDateFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [formValues, setFormValues] = useState<ExpenseFormValues>({
    description: "",
    amount: "",
    category: "other",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // Filter and search expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const matchSearch =
        expense.description.toLowerCase().includes(search.toLowerCase()) ||
        (expense.notes?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchCategory =
        categoryFilter === "all" || (expense.category as ExpenseCategory) === categoryFilter;
      const matchDate = !dateFilter || expense.date.startsWith(dateFilter);

      return matchSearch && matchCategory && matchDate;
    });
  }, [expenses, search, categoryFilter, dateFilter]);

  // Calculate totals
  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [filteredExpenses]);

  const handleAdd = () => {
    setEditingExpense(null);
    setFormValues({
      description: "",
      amount: "",
      category: "other",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormValues({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category as ExpenseCategory,
      date: expense.date,
      notes: expense.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (
      !formValues.description.trim() ||
      !formValues.amount ||
      parseFloat(formValues.amount) <= 0
    ) {
      toast({
        title: "Error",
        description: "Please fill in all required fields correctly",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingExpense) {
        // Update existing expense
        await updateExpense.mutateAsync({
          id: editingExpense.id,
          updates: {
            description: formValues.description,
            amount: parseFloat(formValues.amount),
            category: formValues.category,
            date: formValues.date,
            notes: formValues.notes,
          },
        });
        toast({
          title: "Success",
          description: "Expense updated successfully",
        });
      } else {
        // Add new expense
        await addExpense.mutateAsync({
          description: formValues.description,
          amount: parseFloat(formValues.amount),
          category: formValues.category,
          date: formValues.date,
          notes: formValues.notes,
          type: "expense",
        });
        toast({
          title: "Success",
          description: "Expense added successfully",
        });
      }
      setDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save expense",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteExpense.mutateAsync(deleteTarget.id);
      toast({
        title: "Success",
        description: "Expense deleted successfully",
      });
      setDeleteTarget(null);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete expense",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center pt-6 md:pt-0">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 pt-6 md:pt-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Manage Expenses</h1>
        </div>
        <Button onClick={handleAdd} className="gap-2" disabled={addExpense.isPending}>
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatRupiah(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">{filteredExpenses.length} expense(s)</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="search">Search</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search expenses by description or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            value={categoryFilter}
            onValueChange={(value) =>
              setCategoryFilter(value as ExpenseCategory | "all")
            }
          >
            <SelectTrigger id="category" className="w-full md:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {EXPENSE_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Month</Label>
          <Input
            id="date"
            type="month"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="md:w-[140px]"
          />
        </div>

        {(search || categoryFilter !== "all" || dateFilter) && (
          <Button
            variant="outline"
            onClick={() => {
              setSearch("");
              setCategoryFilter("all");
              setDateFilter("");
            }}
            className="md:self-end"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Expenses Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredExpenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <AlertTriangle className="h-5 w-5" />
                    <span>No expenses found</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium">{formatDate(expense.date)}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{expense.description}</p>
                      {expense.notes && (
                        <p className="text-sm text-muted-foreground">{expense.notes}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="rounded-full bg-secondary px-3 py-1 text-sm font-medium">
                      {getCategoryLabel(expense.category)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {formatRupiah(expense.amount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(expense)}
                        disabled={updateExpense.isPending || deleteExpense.isPending}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(expense)}
                        disabled={deleteExpense.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? "Edit Expense" : "Add New Expense"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                value={formValues.description}
                onChange={(e) =>
                  setFormValues({ ...formValues, description: e.target.value })
                }
                placeholder="e.g., Electricity Bill, Office Supplies"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (IDR) *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formValues.amount}
                  onChange={(e) =>
                    setFormValues({ ...formValues, amount: e.target.value })
                  }
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formValues.date}
                  onChange={(e) =>
                    setFormValues({ ...formValues, date: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formValues.category}
                onValueChange={(value) =>
                  setFormValues({
                    ...formValues,
                    category: value as ExpenseCategory,
                  })
                }
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formValues.notes}
                onChange={(e) =>
                  setFormValues({ ...formValues, notes: e.target.value })
                }
                placeholder="Additional details (optional)"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={addExpense.isPending || updateExpense.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={addExpense.isPending || updateExpense.isPending}
            >
              {addExpense.isPending || updateExpense.isPending ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>{editingExpense ? "Update" : "Add"} Expense</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteExpense.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteExpense.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteExpense.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
