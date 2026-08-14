export { ProductsPage } from './components/products-page.tsx'
export { ProductDetailPage } from './components/product-detail-page.tsx'
export { ProductsTable } from './components/products-table.tsx'
export { DeleteProductDialog } from './components/delete-product-dialog.tsx'
export { PRODUCT_CATEGORIES } from './data/products.ts'
export type {
  ProductCategory,
  ProductCompletenessItemRecord,
  ProductDetail,
  ProductPaymentMethodRecord,
  ProductRecord,
  ProductStatus,
} from './data/products.ts'
export {
  productsListQueryKey,
  productsListQueryOptions,
  productsQueryKey,
} from './api/list-products.ts'
export { productDetailQueryOptions } from './api/product-detail.ts'
export { completenessItemOptionsQueryOptions } from './api/completeness-item-options.ts'
export type { CompletenessItemOption } from './api/completeness-item-options.ts'
export { paymentMethodOptionsQueryOptions } from './api/payment-method-options.ts'
export type { PaymentMethodOption } from './api/payment-method-options.ts'
export { useCreateProduct } from './api/create-product.ts'
export type { ProductPayload } from './api/create-product.ts'
export {
  useToggleProductStatus,
  useUpdateProduct,
} from './api/update-product.ts'
export { useDeleteProduct } from './api/delete-product.ts'
