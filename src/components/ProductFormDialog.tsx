import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { Product } from "@/types";

const batchSchema = z.object({
  quantity: z.coerce.number().min(1, "Min 1"),
  expiryDate: z.string().min(1, "Required"),
});

const formSchema = z.object({
  name: z.string().min(1, "Name required"),
  sku: z.string().min(1, "SKU required"),
  price: z.coerce.number().min(0, "Price must be ≥ 0"),
  threshold: z.coerce.number().min(0, "Threshold must be ≥ 0"),
  imageUrl: z.string().url().optional().or(z.literal("")),
  batches: z.array(batchSchema).min(1, "Add at least one batch"),
});

export type ProductFormValues = z.infer<typeof formSchema>;

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null; // null = create mode
  onSubmit: (values: ProductFormValues) => void;
  isSubmitting?: boolean;
}

const defaultBatch = (): { quantity: number; expiryDate: string } => ({
  quantity: 1,
  expiryDate: new Date().toISOString().slice(0, 10),
});

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSubmit,
  isSubmitting = false,
}: ProductFormDialogProps) {
  const isEdit = !!product;
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      sku: "",
      price: 0,
      threshold: 0,
      imageUrl: "",
      batches: [defaultBatch()],
    },
  });

  useEffect(() => {
    if (!open) return;
    if (product) {
      form.reset({
        name: product.name,
        sku: product.sku,
        price: product.price,
        threshold: product.threshold,
        imageUrl: product.imageUrl ?? "",
        batches:
          product.batches.length > 0
            ? product.batches.map((b) => ({
                quantity: b.quantity,
                expiryDate: b.expiryDate,
              }))
            : [defaultBatch()],
      });
    } else {
      form.reset({
        name: "",
        sku: "",
        price: 0,
        threshold: 0,
        imageUrl: "",
        batches: [defaultBatch()],
      });
    }
  }, [open, product, form]);

  const batches = form.watch("batches");

  const addBatch = () => {
    form.setValue("batches", [...batches, defaultBatch()]);
  };

  const removeBatch = (index: number) => {
    if (batches.length <= 1) return;
    form.setValue(
      "batches",
      batches.filter((_, i) => i !== index)
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit product" : "Add product"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Chicken Breast" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. CHK-BREAST-001" {...field} disabled={isEdit} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (Rp)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step={100} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="threshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Low stock threshold</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel>Stock batches (quantity + expiry)</FormLabel>
                <Button type="button" variant="outline" size="sm" onClick={addBatch}>
                  Add batch
                </Button>
              </div>
              <div className="space-y-2 rounded-md border p-3">
                {batches.map((_, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <FormField
                      control={form.control}
                      name={`batches.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-xs">Qty</FormLabel>
                          <FormControl>
                            <Input type="number" min={1} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`batches.${index}.expiryDate`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-xs">Expiry</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeBatch(index)}
                      disabled={batches.length <= 1}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
              {form.formState.errors.batches && (
                <p className="text-sm text-destructive">{form.formState.errors.batches.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : isEdit ? "Save" : "Add product"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
