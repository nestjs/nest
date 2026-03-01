import { Injectable } from '@nestjs/common';
import { NewRecipeInput } from './dto/new-recipe.input';
import { RecipesArgs } from './dto/recipes.args';
import { Recipe } from './models/recipe.model';

@Injectable()
export class RecipesService {
  /**
   * MOCK
   * Put some real business logic here
   * Left for demonstration purposes
   */

  private readonly recipes: Recipe[] = [
    {
      id: '1',
      title: 'Lentil Soup',
      description: 'A hearty red lentil soup with warming spices.',
      creationDate: new Date('2024-01-15'),
      ingredients: ['red lentils', 'onion', 'garlic', 'cumin', 'tomatoes', 'vegetable broth'],
    },
    {
      id: '2',
      title: 'Roasted Vegetable Bowl',
      description: 'Oven-roasted seasonal vegetables over a bed of quinoa.',
      creationDate: new Date('2024-02-10'),
      ingredients: ['bell pepper', 'zucchini', 'chickpeas', 'olive oil', 'quinoa', 'lemon'],
    },
    {
      id: '3',
      title: 'Mushroom Stir Fry',
      description: 'Umami-rich mushroom and broccoli stir fry with ginger-soy glaze.',
      creationDate: new Date('2024-03-05'),
      ingredients: ['shiitake mushrooms', 'broccoli', 'ginger', 'soy sauce', 'sesame oil', 'garlic'],
    },
  ];

  async create(data: NewRecipeInput): Promise<Recipe> {
    const recipe: Recipe = {
      id: String(Date.now()),
      creationDate: new Date(),
      ...data,
    };
    this.recipes.push(recipe);
    return recipe;
  }

  async findOneById(id: string): Promise<Recipe> {
    return this.recipes.find(recipe => recipe.id === id);
  }

  async findAll(recipesArgs: RecipesArgs): Promise<Recipe[]> {
    const { skip, take } = recipesArgs;
    return this.recipes.slice(skip, skip + take);
  }

  async remove(id: string): Promise<boolean> {
    const index = this.recipes.findIndex(recipe => recipe.id === id);
    if (index === -1) {
      return false;
    }
    this.recipes.splice(index, 1);
    return true;
  }
}
