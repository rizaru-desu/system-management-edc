import { Module } from '@nestjs/common';
import { ItemCategoryController } from './item-category.controller';
import { ItemCategoryService } from './item-category.service';

@Module({
  controllers: [ItemCategoryController],
  providers: [ItemCategoryService],
})
export class ItemCategoryModule {}
