'use client'

import { useDashboardAuth } from '@/hooks/useDashboardAuth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useEffect, useState } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

type FoodItem = {
  id: number
  name: string
  calories: number
  protein: number
  fat: number
  carbohydrates: number
}

type MealPlanDayProps = {
  day: number
  initialFoods: FoodItem[]
  onUpdate: (day: number, foods: FoodItem[]) => void
}

export function NutritionPlanDay({ day, initialFoods, onUpdate }: MealPlanDayProps) {
  const { token } = useDashboardAuth()
  const [foods, setFoods] = useState<FoodItem[]>(initialFoods)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setFoods(initialFoods)
  }, [initialFoods])

  const handleAddFood = async () => {
    // Lógica para agregar comida
    const newFood = { id: Date.now(), name: '', calories: 0, protein: 0, fat: 0, carbohydrates: 0 }
    setFoods((prev) => [...prev, newFood])
    onUpdate(day, [...foods, newFood])
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/nutrition/plan/day/${day}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ foods }),
      })
      if (!response.ok) {
        throw new Error('Error al guardar el plan de comidas')
      }
      onUpdate(day, foods)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow-md">
      <h3 className="text-lg font-semibold">Comidas del Día {day}</h3>
      <div className="mt-2 grid grid-cols-2 gap-4">
        {foods.map((food) => (
          <div key={food.id} className="rounded-md border p-3">
            <Input
              type="text"
              placeholder="Nombre de la comida"
              value={food.name}
              onChange={(e) => {
                const updatedFood = { ...food, name: e.target.value }
                setFoods((prev) => prev.map((f) => (f.id === food.id ? updatedFood : f)))
              }}
            />
            <div className="mt-2 grid grid-cols-4 gap-2">
              <Input
                type="number"
                placeholder="Calorías"
                value={food.calories}
                onChange={(e) => {
                  const updatedFood = { ...food, calories: Number(e.target.value) }
                  setFoods((prev) => prev.map((f) => (f.id === food.id ? updatedFood : f)))
                }}
              />
              <Input
                type="number"
                placeholder="Proteínas"
                value={food.protein}
                onChange={(e) => {
                  const updatedFood = { ...food, protein: Number(e.target.value) }
                  setFoods((prev) => prev.map((f) => (f.id === food.id ? updatedFood : f)))
                }}
              />
              <Input
                type="number"
                placeholder="Grasas"
                value={food.fat}
                onChange={(e) => {
                  const updatedFood = { ...food, fat: Number(e.target.value) }
                  setFoods((prev) => prev.map((f) => (f.id === food.id ? updatedFood : f)))
                }}
              />
              <Input
                type="number"
                placeholder="Carbohidratos"
                value={food.carbohydrates}
                onChange={(e) => {
                  const updatedFood = { ...food, carbohydrates: Number(e.target.value) }
                  setFoods((prev) => prev.map((f) => (f.id === food.id ? updatedFood : f)))
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-between">
        <Button variant="outline" onClick={handleAddFood}>
          + Agregar comida
        </Button>
        <Button onClick={handleSave}>
          Guardar
        </Button>
      </div>
    </div>
  )
}