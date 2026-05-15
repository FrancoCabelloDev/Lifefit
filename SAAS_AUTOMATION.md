# Arquitectura de Automatización SaaS (Self-Service Onboarding)

Para que LifeFit pueda escalar y "vender mientras duermes", es necesario pasar de un modelo de creación manual (donde el Superadmin registra cada gimnasio a mano) a un modelo de **Self-Service Onboarding**. 

En este documento se detalla la arquitectura necesaria para lograr que un cliente entre a tu web, pague con su tarjeta, y a los pocos segundos tenga su gimnasio creado, configurado y listo para usarse de forma 100% automática.

---

## 1. El Modelo de Base de Datos (Suscripciones y Tiers)

Actualmente, los topes (`max_athletes`, etc.) están directamente en el modelo `Gym`. Para automatizar las ventas, necesitamos abstraer esto en un sistema de Planes.

### Nuevos Modelos Requeridos (Django)

1. **`Plan` (o `Tier`)**
   Define qué vendes y cuáles son las reglas.
   - `name`: (Ej. "Pro", "Élite", "Básico")
   - `price`: (Ej. 70.00)
   - `currency`: (Ej. "PEN" o "USD")
   - `max_athletes`: Límite de capacidad.
   - `max_coaches`: Límite de staff.
   - `stripe_price_id`: ID del producto en tu pasarela de pagos.

2. **`Subscription`**
   Conecta a un `Gym` con un `Plan` y controla la caducidad.
   - `gym`: Relación 1 a 1 con el gimnasio.
   - `plan`: El plan contratado.
   - `status`: (Ej. "active", "past_due", "canceled")
   - `current_period_end`: Fecha en que vence el mes pagado (Si pasa esta fecha y no renovó, el sistema le bloquea el acceso).
   - `gateway_subscription_id`: El ID de la suscripción en Stripe/MercadoPago.

---

## 2. El Flujo del Usuario (Frontend)

El flujo para el cliente B2B (el dueño del gimnasio que quiere comprar tu software) es el siguiente:

1. **Página de Precios (`/pricing`):** El usuario ve los beneficios de los distintos `Planes` y hace clic en "Empezar Gratis" o "Comprar Plan Pro".
2. **Registro Básico:** Antes de pagar, le pides 3 datos clave: Nombre de su gimnasio, su correo electrónico y su nombre. 
3. **Checkout (Pasarela):** Es redirigido a la pantalla de pago seguro (Stripe Checkout o MercadoPago Web Checkout) donde ingresa su tarjeta.
4. **Pantalla de Éxito (`/pago-exitoso`):** Una vez que paga, es redirigido de vuelta a tu plataforma, donde le muestras un mensaje: *"Estamos configurando tu gimnasio, revisa tu correo en 1 minuto."*

---

## 3. La Automatización Técnica (Backend y Webhooks)

El corazón de la automatización son los **Webhooks**. Un Webhook es una forma que tiene la pasarela de pagos (ej. Stripe) de avisarle a tu backend (Django) que algo ocurrió, sin que tú se lo preguntes.

### Paso a paso del Webhook:
1. El usuario completa el pago en Stripe.
2. Stripe hace una petición `POST` invisible a tu servidor (ej. `https://api.lifefit.com/api/webhooks/stripe/`).
3. El JSON de esa petición incluye el correo del cliente, cuánto pagó y el `stripe_price_id` del plan que compró.

### Lógica en el endpoint de Django (`stripe_webhook_view`):
```python
# 1. Validar la firma criptográfica para evitar hackeos
verify_signature(request)

if event.type == "checkout.session.completed":
    # 2. Extraer datos del evento
    email = event.data.object.customer_email
    gym_name = event.data.object.metadata.gym_name
    plan_id = event.data.object.metadata.plan_id

    # 3. Crear la base de datos del cliente (Automático)
    plan = Plan.objects.get(id=plan_id)
    gym = Gym.objects.create(name=gym_name, max_athletes=plan.max_athletes)
    
    # 4. Crear la Suscripción Activa
    Subscription.objects.create(gym=gym, plan=plan, status="active")

    # 5. Crear el Administrador
    admin = User.objects.create(email=email, role="GYM_ADMIN", gym=gym)
    admin.set_unusable_password()
    admin.save()

    # 6. Enviar el Correo Mágico
    token = default_token_generator.make_token(admin)
    send_invitation_email(email, token)
```

---

## 4. Recomendación de Pasarelas de Pago para B2B

Para un SaaS, necesitas una pasarela que maneje **cargos recurrentes automáticos** (que le cobren a la tarjeta todos los meses sin que el cliente tenga que hacer nada).

1. **Stripe (El estándar global):**
   - **Ventajas:** Es la mejor API del mundo. Maneja suscripciones, "grace periods", prorrateos (si el usuario sube de plan a mitad de mes, le cobra solo la diferencia automáticamente) y tiene un portal para que el cliente cancele su suscripción sin programar tú nada.
   - **Desventaja:** No acepta Yape/Plin, y su soporte local en Latam es limitado comparado a soluciones nativas.

2. **MercadoPago:**
   - **Ventajas:** Es el rey en Latinoamérica. Acepta todas las tarjetas locales e incluso permite generar links de suscripción.
   - **Desventaja:** Su API para manejar suscripciones complejas (B2B SaaS) es más rústica que Stripe y la documentación puede ser confusa.

**Recomendación:** Si tu público objetivo inicial son gimnasios formales en Perú, **MercadoPago** te abrirá más puertas de conversión rápida. Si planeas vender a toda Latinoamérica o US, y solo quieres lidiar con tarjetas de crédito/débito internacionales, **Stripe** te ahorrará 100 horas de programación.
