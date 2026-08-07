import * as React from 'react'
import { LoaderCircle, Search } from 'lucide-react'

import { Input } from './input.tsx'
import { cn } from '#/lib/utils.ts'

export interface SearchInputProps extends React.ComponentProps<'input'> {
  isFetching?: boolean
  containerClassName?: string
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, containerClassName, isFetching, ...props }, ref) => {
    return (
      <div className={cn('relative min-w-[200px] flex-1', containerClassName)}>
        <Search
          className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#3F6FA8]"
          strokeWidth={1.75}
        />
        <Input
          ref={ref}
          className={cn(
            'border-[#DDE0EC] bg-white pl-9 text-[#0E2748] placeholder:text-[#0E2748]/40 dark:border-[#DDE0EC] dark:bg-white',
            className,
          )}
          {...props}
        />
        {isFetching && (
          <LoaderCircle
            className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-[#3F6FA8]"
            strokeWidth={1.75}
          />
        )}
      </div>
    )
  },
)

SearchInput.displayName = 'SearchInput'

export { SearchInput }
