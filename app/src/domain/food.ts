export type FoodType = 'dairy' | 'fruit' | 'meat'

export interface Food {
  id: string
  name: string
  type: FoodType
}
