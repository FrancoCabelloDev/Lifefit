# Guía Rápida - Datos de Prueba para Lifefit

Accede al panel de administración: `http://localhost:8000/admin`
- **Usuario**: `admin@lifefit.com`
- **Contraseña**: Tu contraseña de admin

---

## 🏆 RETO DE PRUEBA

### Crear Reto
**Ubicación**: CHALLENGES → Challenges → Add Challenge

**Datos del Reto:**
- **Name** (Nombre): Desafío 30 Días de Constancia
- **Description** (Descripción): Completa 30 días consecutivos de entrenamiento y gana puntos extra
- **Type** (Tipo): attendance (asistencia)
- **Start date** (Fecha de inicio): 2025-11-18
- **End date** (Fecha de fin): 2025-12-18
- **Reward points** (Puntos de recompensa): 500
- **Goal value** (Valor objetivo): 30
- **Status** (Estado): active (activo)
- **Gym** (Gimnasio): (dejar vacío para reto global)

---

## 💪 RUTINA DE PRUEBA CON 3 EJERCICIOS

### Paso 1: Crear 3 Ejercicios
**Ubicación**: WORKOUTS → Exercises → Add Exercise

#### Ejercicio 1: Sentadillas
- **Name** (Nombre): Sentadillas
- **Category** (Categoría): strength (fuerza)
- **Equipment** (Equipo): Sin equipo
- **Muscle group** (Grupo muscular): Piernas, Glúteos
- **Description** (Descripción): Baja flexionando rodillas hasta 90° manteniendo espalda recta
- **Gym** (Gimnasio): (dejar vacío)
- Hacer clic en **Save** (Guardar)

#### Ejercicio 2: Flexiones
- **Name** (Nombre): Flexiones
- **Category** (Categoría): strength (fuerza)
- **Equipment** (Equipo): Sin equipo
- **Muscle group** (Grupo muscular): Pecho, Tríceps, Hombros
- **Description** (Descripción): En posición de plancha, baja el cuerpo hasta casi tocar el suelo
- **Gym** (Gimnasio): (dejar vacío)
- Hacer clic en **Save** (Guardar)

#### Ejercicio 3: Plancha Abdominal
- **Name** (Nombre): Plancha Abdominal
- **Category** (Categoría): strength (fuerza)
- **Equipment** (Equipo): Sin equipo
- **Muscle group** (Grupo muscular): Core (abdomen)
- **Description** (Descripción): Mantén posición de plancha con antebrazos en el suelo, cuerpo recto
- **Gym** (Gimnasio): (dejar vacío)
- Hacer clic en **Save** (Guardar)

### Paso 2: Crear la Rutina
**Ubicación**: WORKOUTS → Workout routines → Add Workout routine

**Datos de la Rutina:**
- **Name** (Nombre): Rutina Express Cuerpo Completo
- **Objective** (Objetivo): Entrenamiento rápido y efectivo para todo el cuerpo sin equipo
- **Level** (Nivel): beginner (principiante)
- **Duration minutes** (Duración en minutos): 20
- **Status** (Estado): published (publicado)
- **Points reward** (Puntos de recompensa): 30
- **Gym** (Gimnasio): (dejar vacío)
- Hacer clic en **Save** (Guardar)

### Paso 3: Agregar los 3 Ejercicios a la Rutina
**Ubicación**: WORKOUTS → Routine exercises → Add Routine exercise

#### Agregar Sentadillas (Ejercicio 1)
- **Routine** (Rutina): Rutina Express Cuerpo Completo
- **Exercise** (Ejercicio): Sentadillas
- **Order** (Orden): 1
- **Sets** (Series): 3
- **Reps** (Repeticiones): 15
- **Rest seconds** (Segundos de descanso): 60
- Hacer clic en **"Save and add another"** (Guardar y agregar otro)

#### Agregar Flexiones (Ejercicio 2)
- **Routine** (Rutina): Rutina Express Cuerpo Completo
- **Exercise** (Ejercicio): Flexiones
- **Order** (Orden): 2
- **Sets** (Series): 3
- **Reps** (Repeticiones): 10
- **Rest seconds** (Segundos de descanso): 60
- Hacer clic en **"Save and add another"** (Guardar y agregar otro)

#### Agregar Plancha (Ejercicio 3)
- **Routine** (Rutina): Rutina Express Cuerpo Completo
- **Exercise** (Ejercicio): Plancha Abdominal
- **Order** (Orden): 3
- **Sets** (Series): 3
- **Reps** (Repeticiones): 30
- **Rest seconds** (Segundos de descanso): 45
- Hacer clic en **"Save"** (Guardar)

---

## 🥗 PLAN DE NUTRICIÓN DE PRUEBA

### Paso 1: Crear el Plan de Nutrición
**Ubicación**: NUTRITION → Nutrition plans → Add Nutrition plan

**Datos del Plan:**
- **Name** (Nombre): Plan Saludable Peruano - 1 Día
- **Objective** (Objetivo): balanced_diet (dieta balanceada)
- **Status** (Estado): active (activo)
- **Days duration** (Duración en días): 1
- **Points reward** (Puntos de recompensa): 20
- **Gym** (Gimnasio): (dejar vacío)
- Hacer clic en **Save** (Guardar)

### Paso 2: Crear Comida Peruana
**Ubicación**: NUTRITION → Meals → Add Meal

**Datos de la Comida:**
- **Name** (Nombre): Ceviche de Pescado con Camote
- **Description** (Descripción): Ceviche fresco de pescado blanco marinado en limón, con cebolla morada, ají limo, cilantro, acompañado de camote sancochado y choclo
- **Meal type** (Tipo de comida): lunch (almuerzo)
- **Calories** (Calorías): 420
- **Proteins** (Proteínas): 35
- **Carbs** (Carbohidratos): 45
- **Fats** (Grasas): 8
- **Preparation time** (Tiempo de preparación): 30 minutos
- Hacer clic en **Save** (Guardar)

### Paso 3: Asociar la Comida al Plan
**Ubicación**: NUTRITION → Plan meals → Add Plan meal

**Datos de la Asociación:**
- **Plan** (Plan): Plan Saludable Peruano - 1 Día
- **Meal** (Comida): Ceviche de Pescado con Camote
- **Day number** (Número de día): 1
- **Order** (Orden): 1
- Hacer clic en **Save** (Guardar)

---

## ✅ Verificación

Después de crear todo, verifica en el frontend:

1. **Retos**: `/retos` - Deberías ver "Desafío 30 Días de Constancia"
2. **Rutinas**: `/rutinas` - Deberías ver "Rutina Express Cuerpo Completo" con 3 ejercicios
3. **Nutrición**: `/nutricion` - Deberías ver "Plan Saludable Peruano - 1 Día" con el ceviche

---

¡Listo para probar todos los módulos de Lifefit! 🚀
