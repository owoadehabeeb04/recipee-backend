    // Create the base recipe data 
    // Use proper typing to match your schema
    export interface BaseRecipeData {
        title: string;
        description: string;
        category: string;
        cookingTime: number;
        difficulty: string;
        servings: number;
        ingredients: any[];
        steps: string[];
        featuredImage: string;
        tips: string[];
        nutrition: {
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
          fiber: number;
          sugar: number;
        };
        isPrivate: boolean;
        isPublished: boolean;
        roleCreated: string;
      }
  
      // Admin recipe includes these additional fields
     export  interface AdminRecipeData extends BaseRecipeData {
        admin: any;
        adminId: any;
        adminDetails: {
          name: string;
          email: string;
          role: string;
        };
      }
  
      // User recipe includes this additional field
      export interface UserRecipeData extends BaseRecipeData {
        user: any;
        userDetails: {
          name: string;
          email: string;
          role: string | 'user';
        }
      }
  