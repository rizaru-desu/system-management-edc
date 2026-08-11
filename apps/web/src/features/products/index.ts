export { ProductsPage } from './components/products-page.tsx'
export { ProductDetailPage } from './components/product-detail-page.tsx'
export { ProductsTable } from './components/products-table.tsx'
export { DeleteProductDialog } from './components/delete-product-dialog.tsx'
export { PRODUCT_CATEGORIES } from './data/products.ts'
export type {
  ProductCategory,
  ProductCompletenessItemRecord,
  ProductDetail,
  ProductRecord,
  ProductStatus,
} from './data/products.ts'
export {
  productsListQueryKey,
  productsListQueryOptions,
  productsQueryKey,
} from './api/list-products.ts'
export { productDetailQueryOptions } from './api/product-detail.ts'
export { useCreateProduct } from './api/create-product.ts'
export type { ProductPayload } from './api/create-product.ts'
export {
  useToggleProductStatus,
  useUpdateProduct,
} from './api/update-product.ts'
export { useDeleteProduct } from './api/delete-product.ts'
