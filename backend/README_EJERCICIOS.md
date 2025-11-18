# Guía para Crear Ejercicios y Rutinas en Lifefit

Este documento explica cómo crear ejercicios y agregarlos a rutinas manualmente usando la interfaz web de administración de Django.

## 📋 Tabla de Contenidos

1. [Acceder al Panel de Administración](#1-acceder-al-panel-de-administración)
2. [Crear Ejercicios](#2-crear-ejercicios)
3. [Crear Rutinas](#3-crear-rutinas)
4. [Agregar Ejercicios a Rutinas](#4-agregar-ejercicios-a-rutinas)
5. [Ejemplos de Rutinas Completas](#5-ejemplos-de-rutinas-completas)

---

## 1. Acceder al Panel de Administración

1. Abre tu navegador y ve a: `http://localhost:8000/admin`
2. Ingresa con tu usuario administrador:
   - **Usuario**: `admin@lifefit.com`
   - **Contraseña**: Tu contraseña de admin

---

## 2. Crear Ejercicios

### Pasos:

1. En el panel admin, busca la sección **WORKOUTS**
2. Click en **Exercises** → **Add Exercise** (botón verde "+")
3. Completa los campos:
   - **Name**: Nombre del ejercicio
   - **Category**: Selecciona la categoría
   - **Equipment**: Equipo necesario
   - **Muscle group**: Grupo muscular trabajado
   - **Description**: Descripción del ejercicio
   - **Gym**: (Opcional) Selecciona un gym o déjalo vacío para ejercicio global
4. Click en **Save**

### Lista de Ejercicios Recomendados para Crear:

#### 💪 Ejercicios de Fuerza (strength)

1. **Press de Banca**
   - Category: strength
   - Equipment: Barra, Banco plano, Discos
   - Muscle group: Pecho, Tríceps, Hombros
   - Description: Acostado en banco plano, baja la barra hasta el pecho y empuja hacia arriba con control.

2. **Sentadillas con Barra**
   - Category: strength
   - Equipment: Barra, Rack, Discos
   - Muscle group: Piernas (Cuádriceps, Glúteos, Isquiotibiales)
   - Description: Con la barra en la espalda alta, baja flexionando rodillas y caderas hasta 90°, sube con fuerza.

3. **Peso Muerto**
   - Category: strength
   - Equipment: Barra, Discos
   - Muscle group: Espalda baja, Glúteos, Isquiotibiales
   - Description: Con la barra en el suelo, levántala manteniendo espalda recta hasta posición erguida.

4. **Press Militar**
   - Category: strength
   - Equipment: Barra o Mancuernas
   - Muscle group: Hombros, Tríceps
   - Description: De pie, empuja la barra desde los hombros hasta extensión completa por encima de la cabeza.

5. **Dominadas**
   - Category: strength
   - Equipment: Barra de dominadas
   - Muscle group: Espalda, Bíceps
   - Description: Colgado de la barra, sube hasta que la barbilla supere la barra.

6. **Remo con Barra**
   - Category: strength
   - Equipment: Barra, Discos
   - Muscle group: Espalda media, Bíceps
   - Description: Inclinado hacia adelante, lleva la barra hacia el abdomen manteniendo espalda recta.

7. **Fondos en Paralelas**
   - Category: strength
   - Equipment: Barras paralelas
   - Muscle group: Pecho, Tríceps, Hombros
   - Description: Entre las barras, baja flexionando codos hasta 90° y sube extendiendo brazos.

8. **Curl de Bíceps con Barra**
   - Category: strength
   - Equipment: Barra Z o recta
   - Muscle group: Bíceps
   - Description: De pie, flexiona los codos llevando la barra hacia los hombros sin mover la espalda.

#### 🏃 Ejercicios de Cardio (cardio)

9. **Burpees**
   - Category: cardio
   - Equipment: Sin equipo
   - Muscle group: Cuerpo completo
   - Description: Sentadilla, plancha, flexión, salto vertical. Movimiento explosivo completo.

10. **Jumping Jacks**
    - Category: cardio
    - Equipment: Sin equipo
    - Muscle group: Cuerpo completo
    - Description: Saltos abriendo y cerrando piernas mientras elevas brazos por encima de la cabeza.

11. **Mountain Climbers**
    - Category: cardio
    - Equipment: Sin equipo
    - Muscle group: Core, Cardio
    - Description: En posición de plancha, lleva rodillas al pecho alternadamente de forma rápida.

12. **Sprints en Cinta**
    - Category: cardio
    - Equipment: Cinta de correr
    - Muscle group: Piernas, Cardio
    - Description: Carreras de alta intensidad de 30-60 segundos.

#### 🧘 Ejercicios de Flexibilidad (flexibility)

13. **Estiramiento de Cuádriceps**
    - Category: flexibility
    - Equipment: Sin equipo
    - Muscle group: Piernas (Cuádriceps)
    - Description: De pie, lleva el pie hacia el glúteo manteniendo rodillas juntas. Mantén 30 segundos.

14. **Plancha Abdominal**
    - Category: strength
    - Equipment: Sin equipo
    - Muscle group: Core
    - Description: Posición de plancha con antebrazos en el suelo, mantén cuerpo recto de 30-60 segundos.

15. **Zancadas con Peso**
    - Category: strength
    - Equipment: Mancuernas
    - Muscle group: Piernas, Glúteos
    - Description: Paso largo hacia adelante, baja hasta rodilla casi toca el suelo, alterna piernas.

---

## 3. Crear Rutinas

### Pasos:

1. En el panel admin, ve a **WORKOUTS** → **Workout routines**
2. Click en **Add Workout routine**
3. Completa los campos:
   - **Name**: Nombre de la rutina
   - **Objective**: Objetivo principal
   - **Level**: beginner/intermediate/advanced
   - **Duration minutes**: Duración estimada
   - **Status**: published (para que sea visible)
   - **Points reward**: Puntos que gana el usuario
   - **Gym**: (Opcional) Selecciona un gym o déjalo vacío para rutina global
4. Click en **Save**

---

## 4. Agregar Ejercicios a Rutinas

### Pasos:

1. En el panel admin, ve a **WORKOUTS** → **Routine exercises**
2. Click en **Add Routine exercise**
3. Completa los campos:
   - **Routine**: Selecciona la rutina creada
   - **Exercise**: Selecciona el ejercicio
   - **Order**: Orden de ejecución (1, 2, 3...)
   - **Sets**: Número de series
   - **Reps**: Repeticiones por serie
   - **Rest seconds**: Descanso entre series
4. Click en **Save and add another** para seguir agregando ejercicios
5. Repite para cada ejercicio de la rutina

---

## 5. Ejemplos de Rutinas Completas

### 📘 RUTINA 1: "Fuerza Total - Principiante"

**Datos de la Rutina:**
- **Name**: Fuerza Total - Principiante
- **Objective**: Desarrollar fuerza general en todo el cuerpo para personas que comienzan
- **Level**: beginner
- **Duration minutes**: 45
- **Status**: published
- **Points reward**: 50

**Ejercicios a agregar:**

| Orden | Ejercicio | Series | Reps | Descanso (seg) |
|-------|-----------|--------|------|----------------|
| 1 | Sentadillas con Barra | 3 | 12 | 90 |
| 2 | Press de Banca | 3 | 10 | 90 |
| 3 | Remo con Barra | 3 | 10 | 90 |
| 4 | Press Militar | 3 | 8 | 90 |
| 5 | Plancha Abdominal | 3 | 45 seg | 60 |

---

### 📗 RUTINA 2: "Hipertrofia Avanzada - Torso"

**Datos de la Rutina:**
- **Name**: Hipertrofia Avanzada - Torso
- **Objective**: Maximizar el crecimiento muscular en pecho, espalda y hombros
- **Level**: advanced
- **Duration minutes**: 60
- **Status**: published
- **Points reward**: 100

**Ejercicios a agregar:**

| Orden | Ejercicio | Series | Reps | Descanso (seg) |
|-------|-----------|--------|------|----------------|
| 1 | Press de Banca | 4 | 8 | 120 |
| 2 | Dominadas | 4 | 10 | 120 |
| 3 | Press Militar | 4 | 10 | 90 |
| 4 | Remo con Barra | 4 | 10 | 90 |
| 5 | Fondos en Paralelas | 3 | 12 | 90 |
| 6 | Curl de Bíceps con Barra | 3 | 12 | 60 |

---

### 📙 RUTINA 3: "Pierna Completa - Intermedio"

**Datos de la Rutina:**
- **Name**: Pierna Completa - Intermedio
- **Objective**: Desarrollar fuerza y masa muscular en piernas completas
- **Level**: intermediate
- **Duration minutes**: 50
- **Status**: published
- **Points reward**: 75

**Ejercicios a agregar:**

| Orden | Ejercicio | Series | Reps | Descanso (seg) |
|-------|-----------|--------|------|----------------|
| 1 | Sentadillas con Barra | 4 | 10 | 120 |
| 2 | Peso Muerto | 4 | 8 | 120 |
| 3 | Zancadas con Peso | 3 | 12 por pierna | 90 |
| 4 | Plancha Abdominal | 3 | 60 seg | 60 |
| 5 | Estiramiento de Cuádriceps | 2 | 30 seg | 30 |

---

### 📕 RUTINA 4: "HIIT Cardio Explosivo"

**Datos de la Rutina:**
- **Name**: HIIT Cardio Explosivo
- **Objective**: Quemar grasa y mejorar resistencia cardiovascular con alta intensidad
- **Level**: intermediate
- **Duration minutes**: 25
- **Status**: published
- **Points reward**: 80

**Ejercicios a agregar:**

| Orden | Ejercicio | Series | Reps (segundos) | Descanso (seg) |
|-------|-----------|--------|-----------------|----------------|
| 1 | Burpees | 4 | 45 seg | 15 |
| 2 | Jumping Jacks | 4 | 45 seg | 15 |
| 3 | Mountain Climbers | 4 | 45 seg | 15 |
| 4 | Sprints en Cinta | 4 | 30 seg | 30 |

---

### 📒 RUTINA 5: "Cuerpo Completo - Funcional"

**Datos de la Rutina:**
- **Name**: Cuerpo Completo - Funcional
- **Objective**: Entrenamiento funcional para todo el cuerpo sin equipo especializado
- **Level**: beginner
- **Duration minutes**: 35
- **Status**: published
- **Points reward**: 40

**Ejercicios a agregar:**

| Orden | Ejercicio | Series | Reps | Descanso (seg) |
|-------|-----------|--------|------|----------------|
| 1 | Burpees | 3 | 10 | 60 |
| 2 | Plancha Abdominal | 3 | 45 seg | 60 |
| 3 | Zancadas con Peso | 3 | 12 por pierna | 60 |
| 4 | Mountain Climbers | 3 | 30 seg | 45 |
| 5 | Jumping Jacks | 3 | 20 | 45 |

---

## 💡 Consejos para el Panel Admin

1. **Crea primero todos los ejercicios** antes de crear las rutinas
2. **Usa nombres descriptivos** para facilitar la búsqueda
3. **El orden importa**: Los ejercicios se ejecutan según el número de orden
4. **Descansos apropiados**: 
   - 30-60 seg para ejercicios ligeros
   - 60-90 seg para ejercicios moderados
   - 90-180 seg para ejercicios pesados
5. **Status "published"**: Solo las rutinas con este estado son visibles para los usuarios
6. **Puntos de recompensa**: Asigna más puntos a rutinas más difíciles o largas

---

## 🎯 Categorías de Ejercicios

- **strength** - Fuerza (pesas, resistencia)
- **cardio** - Cardiovascular (correr, saltar)
- **mobility** - Movilidad (movimientos articulares)
- **flexibility** - Flexibilidad (estiramientos)
- **hiit** - HIIT (alta intensidad intervalos)

---

## 📊 Niveles de Rutinas

- **beginner** - Principiante (nuevos en el gym)
- **intermediate** - Intermedio (6+ meses de experiencia)
- **advanced** - Avanzado (experiencia significativa)

---

¡Ahora puedes crear rutinas completas y profesionales desde el panel de administración!
