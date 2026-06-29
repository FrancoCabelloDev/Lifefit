-- ERD Lifefit - Solo tablas del proyecto (sin tablas internas de Django)
BEGIN;

-- =============================================
-- CORE
-- =============================================

CREATE TABLE IF NOT EXISTS public.core_globalannouncement
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    title character varying(200) NOT NULL,
    message text NOT NULL,
    type character varying(20) NOT NULL,
    target_audience character varying(20) NOT NULL,
    is_active boolean NOT NULL,
    expires_at timestamp with time zone,
    CONSTRAINT core_globalannouncement_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.core_featureflag
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    name character varying(100) NOT NULL,
    code character varying(100) NOT NULL,
    description text NOT NULL,
    is_active_globally boolean NOT NULL,
    CONSTRAINT core_featureflag_pkey PRIMARY KEY (id),
    CONSTRAINT core_featureflag_code_key UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS public.core_auditlog
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    user_id uuid,
    action character varying(50) NOT NULL,
    target_object_id character varying(255),
    target_object_repr character varying(255),
    details jsonb NOT NULL,
    ip_address inet,
    CONSTRAINT core_auditlog_pkey PRIMARY KEY (id)
);

-- =============================================
-- ACCOUNTS
-- =============================================

CREATE TABLE IF NOT EXISTS public.accounts_user
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    email character varying(254) NOT NULL,
    password character varying(128) NOT NULL,
    first_name character varying(150) NOT NULL,
    last_name character varying(150) NOT NULL,
    role character varying(20) NOT NULL,
    dni character varying(20),
    phone character varying(20),
    is_active boolean NOT NULL,
    is_staff boolean NOT NULL,
    is_superuser boolean NOT NULL,
    date_joined timestamp with time zone NOT NULL,
    last_login timestamp with time zone,
    gym_id uuid,
    puntos integer NOT NULL,
    nivel integer NOT NULL,
    google_id character varying(255),
    google_picture character varying(200),
    is_google_account boolean NOT NULL,
    profile_picture character varying(255),
    bio text NOT NULL,
    specialty character varying(100) NOT NULL,
    years_experience smallint,
    max_clients smallint NOT NULL,
    height_cm numeric(5, 1),
    weight_kg numeric(5, 1),
    fitness_goal character varying(30) NOT NULL,
    goal_notes text NOT NULL,
    CONSTRAINT accounts_user_pkey PRIMARY KEY (id),
    CONSTRAINT accounts_user_email_key UNIQUE (email)
);

-- =============================================
-- GYMS
-- =============================================

CREATE TABLE IF NOT EXISTS public.gyms_gym
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    name character varying(255) NOT NULL,
    slug character varying(50) NOT NULL,
    description text NOT NULL,
    location character varying(255) NOT NULL,
    status character varying(20) NOT NULL,
    logo character varying(255),
    ruc character varying(20) NOT NULL,
    brand_color character varying(7) NOT NULL,
    website character varying(200) NOT NULL,
    contact_email character varying(254) NOT NULL,
    metrics jsonb NOT NULL,
    max_athletes integer NOT NULL,
    max_coaches integer NOT NULL,
    max_nutritionists integer NOT NULL,
    CONSTRAINT gyms_gym_pkey PRIMARY KEY (id),
    CONSTRAINT gyms_gym_slug_key UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS public.gyms_branch
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    gym_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(50) NOT NULL,
    address character varying(255) NOT NULL,
    city character varying(120) NOT NULL,
    state character varying(120) NOT NULL,
    country character varying(120) NOT NULL,
    zipcode character varying(20) NOT NULL,
    status character varying(20) NOT NULL,
    phone character varying(30) NOT NULL,
    latitude numeric(9, 6),
    longitude numeric(9, 6),
    CONSTRAINT gyms_branch_pkey PRIMARY KEY (id),
    CONSTRAINT gyms_branch_gym_id_slug_uniq UNIQUE (gym_id, slug)
);

CREATE TABLE IF NOT EXISTS public.gyms_gymmembershipplan
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    gym_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text NOT NULL,
    price numeric(10, 2) NOT NULL,
    duration_days integer NOT NULL,
    tier character varying(10) NOT NULL,
    features jsonb NOT NULL,
    is_active boolean NOT NULL,
    CONSTRAINT gyms_gymmembershipplan_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.gyms_gymsubscription
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    athlete_id uuid NOT NULL,
    gym_id uuid NOT NULL,
    plan_id uuid,
    status character varying(20) NOT NULL,
    start_date date NOT NULL,
    end_date date,
    auto_renew boolean NOT NULL,
    CONSTRAINT gyms_gymsubscription_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.gyms_gympayment
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    gym_id uuid NOT NULL,
    subscription_id uuid,
    athlete_id uuid,
    plan_id uuid,
    amount numeric(10, 2) NOT NULL,
    currency character varying(10) NOT NULL,
    status character varying(20) NOT NULL,
    paid_at timestamp with time zone NOT NULL,
    due_date date,
    payment_method character varying(50) NOT NULL,
    reference character varying(255) NOT NULL,
    notes text NOT NULL,
    CONSTRAINT gyms_gympayment_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.gyms_gymfeatureflag
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    gym_id uuid NOT NULL,
    feature_flag_id uuid NOT NULL,
    is_active boolean NOT NULL,
    CONSTRAINT gyms_gymfeatureflag_pkey PRIMARY KEY (id),
    CONSTRAINT gyms_gymfeatureflag_gym_id_feature_flag_id_uniq UNIQUE (gym_id, feature_flag_id)
);

CREATE TABLE IF NOT EXISTS public.gyms_checkin
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    user_id uuid NOT NULL,
    gym_id uuid NOT NULL,
    branch_id uuid,
    method character varying(10) NOT NULL,
    timestamp timestamp with time zone NOT NULL,
    CONSTRAINT gyms_checkin_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.gyms_notification
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    recipient_id uuid NOT NULL,
    actor_id uuid,
    notification_type character varying(40) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    gym_id uuid,
    is_read boolean NOT NULL,
    link character varying(500) NOT NULL,
    CONSTRAINT gyms_notification_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.gyms_coachassignment
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    coach_id uuid NOT NULL,
    athlete_id uuid NOT NULL,
    gym_id uuid NOT NULL,
    is_active boolean NOT NULL,
    assigned_at timestamp with time zone NOT NULL,
    CONSTRAINT gyms_coachassignment_pkey PRIMARY KEY (id),
    CONSTRAINT gyms_coachassignment_coach_id_athlete_id_uniq UNIQUE (coach_id, athlete_id)
);

CREATE TABLE IF NOT EXISTS public.gyms_coachmessage
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    coach_id uuid NOT NULL,
    athlete_id uuid NOT NULL,
    gym_id uuid NOT NULL,
    sender_is_coach boolean NOT NULL,
    body text NOT NULL,
    is_read boolean NOT NULL,
    CONSTRAINT gyms_coachmessage_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.gyms_nutritionistassignment
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    nutritionist_id uuid NOT NULL,
    athlete_id uuid NOT NULL,
    gym_id uuid NOT NULL,
    is_active boolean NOT NULL,
    assigned_at timestamp with time zone NOT NULL,
    CONSTRAINT gyms_nutritionistassignment_pkey PRIMARY KEY (id),
    CONSTRAINT gyms_nutritionistassignment_nutritionist_athlete_uniq UNIQUE (nutritionist_id, athlete_id)
);

CREATE TABLE IF NOT EXISTS public.gyms_nutritionistappointment
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    nutritionist_id uuid NOT NULL,
    athlete_id uuid NOT NULL,
    gym_id uuid NOT NULL,
    scheduled_at timestamp with time zone NOT NULL,
    duration_minutes integer NOT NULL,
    appointment_type character varying(20) NOT NULL,
    status character varying(30) NOT NULL,
    notes text NOT NULL,
    clinical_notes text NOT NULL,
    reschedule_note text NOT NULL,
    cancelled_by character varying(20) NOT NULL,
    CONSTRAINT gyms_nutritionistappointment_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.gyms_nutritionistavailability
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    nutritionist_id uuid NOT NULL,
    gym_id uuid NOT NULL,
    day_of_week integer NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    slot_duration_minutes integer NOT NULL,
    is_active boolean NOT NULL,
    CONSTRAINT gyms_nutritionistavailability_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.gyms_availabilityoverride
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    nutritionist_id uuid NOT NULL,
    gym_id uuid NOT NULL,
    date date NOT NULL,
    reason character varying(255) NOT NULL,
    CONSTRAINT gyms_availabilityoverride_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.gyms_nutritionistmessage
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    nutritionist_id uuid NOT NULL,
    athlete_id uuid NOT NULL,
    gym_id uuid NOT NULL,
    sender_is_nutritionist boolean NOT NULL,
    body text NOT NULL,
    is_read boolean NOT NULL,
    CONSTRAINT gyms_nutritionistmessage_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.gyms_bodymeasurement
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    nutritionist_id uuid,
    athlete_id uuid NOT NULL,
    gym_id uuid NOT NULL,
    measured_at date NOT NULL,
    weight_kg numeric(5, 2),
    height_cm numeric(5, 2),
    body_fat_pct numeric(5, 2),
    muscle_mass_kg numeric(5, 2),
    waist_cm numeric(5, 2),
    hip_cm numeric(5, 2),
    arm_cm numeric(5, 2),
    visceral_fat smallint,
    notes text NOT NULL,
    CONSTRAINT gyms_bodymeasurement_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.gyms_athletegoal
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    athlete_id uuid NOT NULL,
    gym_id uuid NOT NULL,
    target_weight_kg numeric(5, 2),
    target_body_fat_pct numeric(5, 2),
    target_date date,
    notes text NOT NULL,
    CONSTRAINT gyms_athletegoal_pkey PRIMARY KEY (id),
    CONSTRAINT gyms_athletegoal_athlete_id_key UNIQUE (athlete_id)
);

-- =============================================
-- WORKOUTS
-- =============================================

CREATE TABLE IF NOT EXISTS public.workouts_exercise
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    gym_id uuid,
    name character varying(255) NOT NULL,
    category character varying(20) NOT NULL,
    equipment character varying(255) NOT NULL,
    muscle_group character varying(255) NOT NULL,
    description text NOT NULL,
    media_url character varying(200) NOT NULL,
    CONSTRAINT workouts_exercise_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.workouts_workoutroutine
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    gym_id uuid,
    name character varying(255) NOT NULL,
    objective text NOT NULL,
    level character varying(20) NOT NULL,
    duration_minutes integer NOT NULL,
    status character varying(20) NOT NULL,
    points_reward integer NOT NULL,
    created_by_id uuid,
    is_public boolean NOT NULL,
    notes text NOT NULL,
    CONSTRAINT workouts_workoutroutine_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.workouts_routineexercise
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    routine_id uuid NOT NULL,
    exercise_id uuid NOT NULL,
    order integer NOT NULL,
    sets integer NOT NULL,
    reps integer NOT NULL,
    rest_seconds integer NOT NULL,
    tempo character varying(50) NOT NULL,
    weight_kg numeric(6, 2),
    CONSTRAINT workouts_routineexercise_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.workouts_workoutsession
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    user_id uuid NOT NULL,
    gym_id uuid,
    routine_id uuid,
    performed_at timestamp with time zone NOT NULL,
    duration_minutes integer NOT NULL,
    perceived_exertion integer NOT NULL,
    completion_percentage numeric(5, 2) NOT NULL,
    notes text NOT NULL,
    status character varying(20) NOT NULL,
    points_awarded integer NOT NULL,
    CONSTRAINT workouts_workoutsession_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.workouts_sessionexerciselog
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    session_id uuid NOT NULL,
    routine_exercise_id uuid NOT NULL,
    sets_completed integer NOT NULL,
    completed boolean NOT NULL,
    CONSTRAINT workouts_sessionexerciselog_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.workouts_userroutineassignment
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    user_id uuid NOT NULL,
    routine_id uuid NOT NULL,
    assigned_by_id uuid,
    start_date date NOT NULL,
    end_date date,
    status character varying(20) NOT NULL,
    compliance_percentage numeric(5, 2) NOT NULL,
    CONSTRAINT workouts_userroutineassignment_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.workouts_weeklyroutineplan
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    athlete_id uuid NOT NULL,
    coach_id uuid,
    routine_id uuid NOT NULL,
    day_of_week integer NOT NULL,
    suggested_time time without time zone,
    notes text NOT NULL,
    CONSTRAINT workouts_weeklyroutineplan_pkey PRIMARY KEY (id)
);

-- =============================================
-- NUTRITION
-- =============================================

CREATE TABLE IF NOT EXISTS public.nutrition_food
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    gym_id uuid,
    created_by_id uuid,
    name character varying(255) NOT NULL,
    food_group character varying(20) NOT NULL,
    source character varying(100) NOT NULL,
    calories_per_100g numeric(7, 2) NOT NULL,
    protein_per_100g numeric(6, 2) NOT NULL,
    carbs_per_100g numeric(6, 2) NOT NULL,
    fats_per_100g numeric(6, 2) NOT NULL,
    fiber_per_100g numeric(6, 2) NOT NULL,
    CONSTRAINT nutrition_food_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.nutrition_nutritionplan
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    gym_id uuid,
    name character varying(255) NOT NULL,
    description text NOT NULL,
    calories_per_day integer NOT NULL,
    protein_g integer NOT NULL,
    carbs_g integer NOT NULL,
    fats_g integer NOT NULL,
    duration_days integer NOT NULL,
    status character varying(20) NOT NULL,
    points_reward integer NOT NULL,
    created_for_id uuid,
    CONSTRAINT nutrition_nutritionplan_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.nutrition_mealtemplate
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    plan_id uuid NOT NULL,
    day_number integer,
    weekday character varying(10),
    meal_type character varying(20) NOT NULL,
    name character varying(255) NOT NULL,
    description text NOT NULL,
    calories integer NOT NULL,
    protein_g integer NOT NULL,
    carbs_g integer NOT NULL,
    fats_g integer NOT NULL,
    ingredients text NOT NULL,
    instructions text NOT NULL,
    order integer NOT NULL,
    CONSTRAINT nutrition_mealtemplate_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.nutrition_mealfooditem
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    meal_id uuid NOT NULL,
    food_id uuid NOT NULL,
    quantity_g numeric(7, 1) NOT NULL,
    order smallint NOT NULL,
    calories numeric(7, 2) NOT NULL,
    protein_g numeric(6, 2) NOT NULL,
    carbs_g numeric(6, 2) NOT NULL,
    fats_g numeric(6, 2) NOT NULL,
    fiber_g numeric(6, 2) NOT NULL,
    CONSTRAINT nutrition_mealfooditem_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.nutrition_nutritionmeal
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    plan_id uuid NOT NULL,
    order integer NOT NULL,
    name character varying(255) NOT NULL,
    meal_time character varying(20) NOT NULL,
    notes text NOT NULL,
    CONSTRAINT nutrition_nutritionmeal_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.nutrition_nutritionitem
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    meal_id uuid NOT NULL,
    food character varying(255) NOT NULL,
    portion character varying(120) NOT NULL,
    macros jsonb NOT NULL,
    CONSTRAINT nutrition_nutritionitem_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.nutrition_usermeallog
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    user_id uuid NOT NULL,
    meal_template_id uuid NOT NULL,
    date date NOT NULL,
    status character varying(20) NOT NULL,
    alternative_food_text text NOT NULL,
    notes text NOT NULL,
    photo character varying(255),
    nutritionist_approved boolean,
    nutritionist_notes text NOT NULL,
    reviewed_by_id uuid,
    reviewed_at timestamp with time zone,
    xp_awarded boolean NOT NULL,
    CONSTRAINT nutrition_usermeallog_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.nutrition_usernutritionplan
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    user_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    assigned_by_id uuid,
    start_date date NOT NULL,
    end_date date,
    status character varying(20) NOT NULL,
    compliance_percentage numeric(5, 2) NOT NULL,
    review_requested_at timestamp with time zone,
    CONSTRAINT nutrition_usernutritionplan_pkey PRIMARY KEY (id)
);

-- =============================================
-- CHALLENGES & GAMIFICATION
-- =============================================

CREATE TABLE IF NOT EXISTS public.challenges_challenge
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    gym_id uuid,
    name character varying(255) NOT NULL,
    description text NOT NULL,
    type character varying(20) NOT NULL,
    start_date date NOT NULL,
    start_time time without time zone,
    end_date date NOT NULL,
    responsible_id uuid,
    reward_points integer NOT NULL,
    goal_value integer NOT NULL,
    status character varying(20) NOT NULL,
    verification_type character varying(20) NOT NULL,
    max_participants integer,
    target_role character varying(20) NOT NULL,
    CONSTRAINT challenges_challenge_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.challenges_challengeparticipation
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    challenge_id uuid NOT NULL,
    user_id uuid NOT NULL,
    progress integer NOT NULL,
    status character varying(20) NOT NULL,
    points_earned integer NOT NULL,
    last_update timestamp with time zone NOT NULL,
    evidence_note text NOT NULL,
    verified_by_id uuid,
    verified_at timestamp with time zone,
    rejection_note text NOT NULL,
    CONSTRAINT challenges_challengeparticipation_pkey PRIMARY KEY (id),
    CONSTRAINT challenges_challengeparticipation_challenge_user_uniq UNIQUE (challenge_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.challenges_badge
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    gym_id uuid,
    name character varying(120) NOT NULL,
    description text NOT NULL,
    icon character varying(255) NOT NULL,
    condition character varying(255) NOT NULL,
    CONSTRAINT challenges_badge_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.challenges_userbadge
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    user_id uuid NOT NULL,
    badge_id uuid NOT NULL,
    awarded_at timestamp with time zone NOT NULL,
    CONSTRAINT challenges_userbadge_pkey PRIMARY KEY (id),
    CONSTRAINT challenges_userbadge_user_badge_uniq UNIQUE (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS public.challenges_userprogress
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    user_id uuid NOT NULL,
    level integer NOT NULL,
    total_points integer NOT NULL,
    current_xp integer NOT NULL,
    next_level_xp integer NOT NULL,
    CONSTRAINT challenges_userprogress_pkey PRIMARY KEY (id),
    CONSTRAINT challenges_userprogress_user_id_key UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.gamification_gympointsconfig
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    gym_id uuid NOT NULL,
    nutrition_week_points integer NOT NULL,
    workout_week_points integer NOT NULL,
    challenge_points integer NOT NULL,
    CONSTRAINT gamification_gympointsconfig_pkey PRIMARY KEY (id),
    CONSTRAINT gamification_gympointsconfig_gym_id_key UNIQUE (gym_id)
);

CREATE TABLE IF NOT EXISTS public.gamification_reward
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    gym_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text NOT NULL,
    image character varying(255),
    points_cost integer NOT NULL,
    stock integer,
    is_active boolean NOT NULL,
    CONSTRAINT gamification_reward_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.gamification_rewardredemption
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    athlete_id uuid NOT NULL,
    reward_id uuid NOT NULL,
    status character varying(20) NOT NULL,
    notes text NOT NULL,
    reviewed_by_id uuid,
    reviewed_at timestamp with time zone,
    CONSTRAINT gamification_rewardredemption_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.gamification_userpoints
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    user_id uuid NOT NULL,
    points integer NOT NULL,
    pending_points integer NOT NULL,
    status character varying(20) NOT NULL,
    source character varying(100) NOT NULL,
    description text NOT NULL,
    week_start date,
    reviewed_by_id uuid,
    reviewed_at timestamp with time zone,
    related_session_id uuid,
    related_challenge_id uuid,
    related_nutrition_plan_id uuid,
    CONSTRAINT gamification_userpoints_pkey PRIMARY KEY (id)
);

-- =============================================
-- SUBSCRIPTIONS (SaaS)
-- =============================================

CREATE TABLE IF NOT EXISTS public.subscriptions_subscriptionplan
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    name character varying(100) NOT NULL,
    description text NOT NULL,
    price numeric(8, 2) NOT NULL,
    currency character varying(10) NOT NULL,
    billing_cycle character varying(20) NOT NULL,
    user_limit integer,
    features jsonb NOT NULL,
    is_active boolean NOT NULL,
    max_athletes integer NOT NULL,
    max_coaches integer NOT NULL,
    max_nutritionists integer NOT NULL,
    display_order integer NOT NULL,
    CONSTRAINT subscriptions_subscriptionplan_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.subscriptions_subscription
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    plan_id uuid NOT NULL,
    owner_gym_id uuid,
    owner_user_id uuid,
    status character varying(20) NOT NULL,
    start_date date NOT NULL,
    end_date date,
    next_billing_date date,
    cancel_at_period_end boolean NOT NULL,
    CONSTRAINT subscriptions_subscription_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.subscriptions_payment
(
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    subscription_id uuid NOT NULL,
    amount numeric(8, 2) NOT NULL,
    currency character varying(10) NOT NULL,
    status character varying(20) NOT NULL,
    paid_at timestamp with time zone NOT NULL,
    provider character varying(50) NOT NULL,
    external_id character varying(120) NOT NULL,
    CONSTRAINT subscriptions_payment_pkey PRIMARY KEY (id)
);

-- =============================================
-- FOREIGN KEYS
-- =============================================

ALTER TABLE public.accounts_user
    ADD CONSTRAINT accounts_user_gym_id_fk FOREIGN KEY (gym_id) REFERENCES public.gyms_gym (id);

ALTER TABLE public.core_auditlog
    ADD CONSTRAINT core_auditlog_user_id_fk FOREIGN KEY (user_id) REFERENCES public.accounts_user (id);

ALTER TABLE public.gyms_branch
    ADD CONSTRAINT gyms_branch_gym_id_fk FOREIGN KEY (gym_id) REFERENCES public.gyms_gym (id);

ALTER TABLE public.gyms_gymmembershipplan
    ADD CONSTRAINT gyms_gymmembershipplan_gym_id_fk FOREIGN KEY (gym_id) REFERENCES public.gyms_gym (id);

ALTER TABLE public.gyms_gymsubscription
    ADD CONSTRAINT gyms_gymsubscription_athlete_id_fk FOREIGN KEY (athlete_id) REFERENCES public.accounts_user (id);
ALTER TABLE public.gyms_gymsubscription
    ADD CONSTRAINT gyms_gymsubscription_gym_id_fk FOREIGN KEY (gym_id) REFERENCES public.gyms_gym (id);
ALTER TABLE public.gyms_gymsubscription
    ADD CONSTRAINT gyms_gymsubscription_plan_id_fk FOREIGN KEY (plan_id) REFERENCES public.gyms_gymmembershipplan (id);

ALTER TABLE public.gyms_gympayment
    ADD CONSTRAINT gyms_gympayment_gym_id_fk FOREIGN KEY (gym_id) REFERENCES public.gyms_gym (id);
ALTER TABLE public.gyms_gympayment
    ADD CONSTRAINT gyms_gympayment_athlete_id_fk FOREIGN KEY (athlete_id) REFERENCES public.accounts_user (id);
ALTER TABLE public.gyms_gympayment
    ADD CONSTRAINT gyms_gympayment_plan_id_fk FOREIGN KEY (plan_id) REFERENCES public.gyms_gymmembershipplan (id);
ALTER TABLE public.gyms_gympayment
    ADD CONSTRAINT gyms_gympayment_subscription_id_fk FOREIGN KEY (subscription_id) REFERENCES public.gyms_gymsubscription (id);

ALTER TABLE public.gyms_gymfeatureflag
    ADD CONSTRAINT gyms_gymfeatureflag_gym_id_fk FOREIGN KEY (gym_id) REFERENCES public.gyms_gym (id);
ALTER TABLE public.gyms_gymfeatureflag
    ADD CONSTRAINT gyms_gymfeatureflag_feature_flag_id_fk FOREIGN KEY (feature_flag_id) REFERENCES public.core_featureflag (id);

ALTER TABLE public.gyms_checkin
    ADD CONSTRAINT gyms_checkin_user_id_fk FOREIGN KEY (user_id) REFERENCES public.accounts_user (id);
ALTER TABLE public.gyms_checkin
    ADD CONSTRAINT gyms_checkin_gym_id_fk FOREIGN KEY (gym_id) REFERENCES public.gyms_gym (id);
ALTER TABLE public.gyms_checkin
    ADD CONSTRAINT gyms_checkin_branch_id_fk FOREIGN KEY (branch_id) REFERENCES public.gyms_branch (id);

ALTER TABLE public.gyms_notification
    ADD CONSTRAINT gyms_notification_recipient_id_fk FOREIGN KEY (recipient_id) REFERENCES public.accounts_user (id);
ALTER TABLE public.gyms_notification
    ADD CONSTRAINT gyms_notification_actor_id_fk FOREIGN KEY (actor_id) REFERENCES public.accounts_user (id);
ALTER TABLE public.gyms_notification
    ADD CONSTRAINT gyms_notification_gym_id_fk FOREIGN KEY (gym_id) REFERENCES public.gyms_gym (id);

ALTER TABLE public.gyms_coachassignment
    ADD CONSTRAINT gyms_coachassignment_coach_id_fk FOREIGN KEY (coach_id) REFERENCES public.accounts_user (id);
ALTER TABLE public.gyms_coachassignment
    ADD CONSTRAINT gyms_coachassignment_athlete_id_fk FOREIGN KEY (athlete_id) REFERENCES public.accounts_user (id);
ALTER TABLE public.gyms_coachassignment
    ADD CONSTRAINT gyms_coachassignment_gym_id_fk FOREIGN KEY (gym_id) REFERENCES public.gyms_gym (id);

ALTER TABLE public.gyms_coachmessage
    ADD CONSTRAINT gyms_coachmessage_coach_id_fk FOREIGN KEY (coach_id) REFERENCES public.accounts_user (id);
ALTER TABLE public.gyms_coachmessage
    ADD CONSTRAINT gyms_coachmessage_athlete_id_fk FOREIGN KEY (athlete_id) REFERENCES public.accounts_user (id);
ALTER TABLE public.gyms_coachmessage
    ADD CONSTRAINT gyms_coachmessage_gym_id_fk FOREIGN KEY (gym_id) REFERENCES public.gyms_gym (id);

ALTER TABLE public.gyms_nutritionistassignment
    ADD CONSTRAINT gyms_nutritionistassignment_nutritionist_id_fk FOREIGN KEY (nutritionist_id) REFERENCES public.accounts_user (id);
ALTER TABLE public.gyms_nutritionistassignment
    ADD CONSTRAINT gyms_nutritionistassignment_athlete_id_fk FOREIGN KEY (athlete_id) REFERENCES public.accounts_user (id);
ALTER TABLE public.gyms_nutritionistassignment
    ADD CONSTRAINT gyms_nutritionistassignment_gym_id_fk FOREIGN KEY (gym_id) REFERENCES public.gyms_gym (id);

ALTER TABLE public.gyms_nutritionistappointment
    ADD CONSTRAINT gyms_nutritionistappointment_nutritionist_id_fk FOREIGN KEY (nutritionist_id) REFERENCES public.accounts_user (id);
ALTER TABLE public.gyms_nutritionistappointment
    ADD CONSTRAINT gyms_nutritionistappointment_athlete_id_fk FOREIGN KEY (athlete_id) REFERENCES public.accounts_user (id);
ALTER TABLE public.gyms_nutritionistappointment
    ADD CONSTRAINT gyms_nutritionistappointment_gym_id_fk FOREIGN KEY (gym_id) REFERENCES public.gyms_gym (id);

ALTER TABLE public.gyms_nutritionistavailability
    ADD CONSTRAINT gyms_nutritionistavailability_nutritionist_id_fk FOREIGN KEY (nutritionist_id) REFERENCES public.accounts_user (id);
ALTER TABLE public.gyms_nutritionistavailability
    ADD CONSTRAINT gyms_nutritionistavailability_gym_id_fk FOREIGN KEY (gym_id) REFERENCES public.gyms_gym (id);

ALTER TABLE public.gyms_availabilityoverride
    ADD CONSTRAINT gyms_availabilityoverride_nutritionist_id_fk FOREIGN KEY (nutritionist_id) REFERENCES public.accounts_user (id);
ALTER TABLE public.gyms_availabilityoverride
    ADD CONSTRAINT gyms_availabilityoverride_gym_id_fk FOREIGN KEY (gym_id) REFERENCES public.gyms_gym (id);

ALTER TABLE public.gyms_nutritionistmessage
    ADD CONSTRAINT gyms_nutritionistmessage_nutritionist_id_fk FOREIGN KEY (nutritionist_id) REFERENCES public.accounts_user (id);
ALTER TABLE public.gyms_nutritionistmessage
    ADD CONSTRAINT gyms_nutritionistmessage_athlete_id_fk FOREIGN KEY (athlete_id) REFERENCES public.accounts_user (id);
ALTER TABLE public.gyms_nutritionistmessage
    ADD CONSTRAINT gyms_nutritionistmessage_gym_id_fk FOREIGN KEY (gym_id) REFERENCES public.gyms_gym (id);

ALTER TABLE public.gyms_bodymeasurement
    ADD CONSTRAINT gyms_bodymeasurement_nutritionist_id_fk FOREIGN KEY (nutritionist_id) REFERENCES public.accounts_user (id);
ALTER TABLE public.gyms_bodymeasurement
    ADD CONSTRAINT gyms_bodymeasurement_athlete_id_fk FOREIGN KEY (athlete_id) REFERENCES public.accounts_user (id);
ALTER TABLE public.gyms_bodymeasurement
    ADD CONSTRAINT gyms_bodymeasurement_gym_id_fk FOREIGN KEY (gym_id) REFERENCES public.gyms_gym (id);

ALTER TABLE public.gyms_athletegoal
    ADD CONSTRAINT gyms_athletegoal_athlete_id_fk FOREIGN KEY (athlete_id) REFERENCES public.accounts_user (id);
ALTER TABLE public.gyms_athletegoal
    ADD CONSTRAINT gyms_athletegoal_gym_id_fk FOREIGN KEY (gym_id) REFERENCES public.gyms_gym (id);

ALTER TABLE public.workouts_exercise
    ADD CONSTRAINT workouts_exercise_gym_id_fk FOREIGN KEY (gym_id) REFERENCES public.gyms_gym (id);

ALTER TABLE public.workouts_workoutroutine
    ADD CONSTRAINT workouts_workoutroutine_gym_id_fk FOREIGN KEY (gym_id) REFERENCES public.gyms_gym (id);
ALTER TABLE public.workouts_workoutroutine
    ADD CONSTRAINT workouts_workoutroutine_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES public.accounts_user (id);

ALTER TABLE public.workouts_routineexercise
    ADD CONSTRAINT workouts_routineexercise_routine_id_fk FOREIGN KEY (routine_id) REFERENCES public.workouts_workoutroutine (id);
ALTER TABLE public.workouts_routineexercise
    ADD CONSTRAINT workouts_routineexercise_exercise_id_fk FOREIGN KEY (exercise_id) REFERENCES public.workouts_exercise (id);

ALTER TABLE public.workouts_workoutsession
    ADD CONSTRAINT workouts_workoutsession_user_id_fk FOREIGN KEY (user_id) REFERENCES public.accounts_user (id);
ALTER TABLE public.workouts_workoutsession
    ADD CONSTRAINT workouts_workoutsession_gym_id_fk FOREIGN KEY (gym_id) REFERENCES public.gyms_gym (id);
ALTER TABLE public.workouts_workoutsession
    ADD CONSTRAINT workouts_workoutsession_routine_id_fk FOREIGN KEY (routine_id) REFERENCES public.workouts_workoutroutine (id);

ALTER TABLE public.workouts_sessionexerciselog
    ADD CONSTRAINT workouts_sessionexerciselog_session_id_fk FOREIGN KEY (session_id) REFERENCES public.workouts_workoutsession (id);
ALTER TABLE public.workouts_sessionexerciselog
    ADD CONSTRAINT workouts_sessionexerciselog_routine_exercise_id_fk FOREIGN KEY (routine_exercise_id) REFERENCES public.workouts_routineexercise (id);

ALTER TABLE public.workouts_userroutineassignment
    ADD CONSTRAINT workouts_userroutineassignment_user_id_fk FOREIGN KEY (user_id) REFERENCES public.accounts_user (id);
ALTER TABLE public.workouts_userroutineassignment
    ADD CONSTRAINT workouts_userroutineassignment_routine_id_fk FOREIGN KEY (routine_id) REFERENCES public.workouts_workoutroutine (id);
ALTER TABLE public.workouts_userroutineassignment
    ADD CONSTRAINT workouts_userroutineassignment_assigned_by_id_fk FOREIGN KEY (assigned_by_id) REFERENCES public.accounts_user (id);

ALTER TABLE public.workouts_weeklyroutineplan
    ADD CONSTRAINT workouts_weeklyroutineplan_athlete_id_fk FOREIGN KEY (athlete_id) REFERENCES public.accounts_user (id);
ALTER TABLE public.workouts_weeklyroutineplan
    ADD CONSTRAINT workouts_weeklyroutineplan_coach_id_fk FOREIGN KEY (coach_id) REFERENCES public.accounts_user (id);
ALTER TABLE public.workouts_weeklyroutineplan
    ADD CONSTRAINT workouts_weeklyroutineplan_routine_id_fk FOREIGN KEY (routine_id) REFERENCES public.workouts_workoutroutine (id);

ALTER TABLE public.nutrition_food
    ADD CONSTRAINT nutrition_food_gym_id_fk FOREIGN KEY (gym_id) REFERENCES public.gyms_gym (id);
ALTER TABLE public.nutrition_food
    ADD CONSTRAINT nutrition_food_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES public.accounts_user (id);

ALTER TABLE public.nutrition_nutritionplan
    ADD CONSTRAINT nutrition_nutritionplan_gym_id_fk FOREIGN KEY (gym_id) REFERENCES public.gyms_gym (id);
ALTER TABLE public.nutrition_nutritionplan
    ADD CONSTRAINT nutrition_nutritionplan_created_for_id_fk FOREIGN KEY (created_for_id) REFERENCES public.accounts_user (id);

ALTER TABLE public.nutrition_mealtemplate
    ADD CONSTRAINT nutrition_mealtemplate_plan_id_fk FOREIGN KEY (plan_id) REFERENCES public.nutrition_nutritionplan (id);

ALTER TABLE public.nutrition_mealfooditem
    ADD CONSTRAINT nutrition_mealfooditem_meal_id_fk FOREIGN KEY (meal_id) REFERENCES public.nutrition_mealtemplate (id);
ALTER TABLE public.nutrition_mealfooditem
    ADD CONSTRAINT nutrition_mealfooditem_food_id_fk FOREIGN KEY (food_id) REFERENCES public.nutrition_food (id);

ALTER TABLE public.nutrition_nutritionmeal
    ADD CONSTRAINT nutrition_nutritionmeal_plan_id_fk FOREIGN KEY (plan_id) REFERENCES public.nutrition_nutritionplan (id);

ALTER TABLE public.nutrition_nutritionitem
    ADD CONSTRAINT nutrition_nutritionitem_meal_id_fk FOREIGN KEY (meal_id) REFERENCES public.nutrition_nutritionmeal (id);

ALTER TABLE public.nutrition_usermeallog
    ADD CONSTRAINT nutrition_usermeallog_user_id_fk FOREIGN KEY (user_id) REFERENCES public.accounts_user (id);
ALTER TABLE public.nutrition_usermeallog
    ADD CONSTRAINT nutrition_usermeallog_meal_template_id_fk FOREIGN KEY (meal_template_id) REFERENCES public.nutrition_mealtemplate (id);
ALTER TABLE public.nutrition_usermeallog
    ADD CONSTRAINT nutrition_usermeallog_reviewed_by_id_fk FOREIGN KEY (reviewed_by_id) REFERENCES public.accounts_user (id);

ALTER TABLE public.nutrition_usernutritionplan
    ADD CONSTRAINT nutrition_usernutritionplan_user_id_fk FOREIGN KEY (user_id) REFERENCES public.accounts_user (id);
ALTER TABLE public.nutrition_usernutritionplan
    ADD CONSTRAINT nutrition_usernutritionplan_plan_id_fk FOREIGN KEY (plan_id) REFERENCES public.nutrition_nutritionplan (id);
ALTER TABLE public.nutrition_usernutritionplan
    ADD CONSTRAINT nutrition_usernutritionplan_assigned_by_id_fk FOREIGN KEY (assigned_by_id) REFERENCES public.accounts_user (id);

ALTER TABLE public.challenges_challenge
    ADD CONSTRAINT challenges_challenge_gym_id_fk FOREIGN KEY (gym_id) REFERENCES public.gyms_gym (id);
ALTER TABLE public.challenges_challenge
    ADD CONSTRAINT challenges_challenge_responsible_id_fk FOREIGN KEY (responsible_id) REFERENCES public.accounts_user (id);

ALTER TABLE public.challenges_challengeparticipation
    ADD CONSTRAINT challenges_challengeparticipation_challenge_id_fk FOREIGN KEY (challenge_id) REFERENCES public.challenges_challenge (id);
ALTER TABLE public.challenges_challengeparticipation
    ADD CONSTRAINT challenges_challengeparticipation_user_id_fk FOREIGN KEY (user_id) REFERENCES public.accounts_user (id);
ALTER TABLE public.challenges_challengeparticipation
    ADD CONSTRAINT challenges_challengeparticipation_verified_by_id_fk FOREIGN KEY (verified_by_id) REFERENCES public.accounts_user (id);

ALTER TABLE public.challenges_badge
    ADD CONSTRAINT challenges_badge_gym_id_fk FOREIGN KEY (gym_id) REFERENCES public.gyms_gym (id);

ALTER TABLE public.challenges_userbadge
    ADD CONSTRAINT challenges_userbadge_user_id_fk FOREIGN KEY (user_id) REFERENCES public.accounts_user (id);
ALTER TABLE public.challenges_userbadge
    ADD CONSTRAINT challenges_userbadge_badge_id_fk FOREIGN KEY (badge_id) REFERENCES public.challenges_badge (id);

ALTER TABLE public.challenges_userprogress
    ADD CONSTRAINT challenges_userprogress_user_id_fk FOREIGN KEY (user_id) REFERENCES public.accounts_user (id);

ALTER TABLE public.gamification_gympointsconfig
    ADD CONSTRAINT gamification_gympointsconfig_gym_id_fk FOREIGN KEY (gym_id) REFERENCES public.gyms_gym (id);

ALTER TABLE public.gamification_reward
    ADD CONSTRAINT gamification_reward_gym_id_fk FOREIGN KEY (gym_id) REFERENCES public.gyms_gym (id);

ALTER TABLE public.gamification_rewardredemption
    ADD CONSTRAINT gamification_rewardredemption_athlete_id_fk FOREIGN KEY (athlete_id) REFERENCES public.accounts_user (id);
ALTER TABLE public.gamification_rewardredemption
    ADD CONSTRAINT gamification_rewardredemption_reward_id_fk FOREIGN KEY (reward_id) REFERENCES public.gamification_reward (id);
ALTER TABLE public.gamification_rewardredemption
    ADD CONSTRAINT gamification_rewardredemption_reviewed_by_id_fk FOREIGN KEY (reviewed_by_id) REFERENCES public.accounts_user (id);

ALTER TABLE public.gamification_userpoints
    ADD CONSTRAINT gamification_userpoints_user_id_fk FOREIGN KEY (user_id) REFERENCES public.accounts_user (id);
ALTER TABLE public.gamification_userpoints
    ADD CONSTRAINT gamification_userpoints_related_session_id_fk FOREIGN KEY (related_session_id) REFERENCES public.workouts_workoutsession (id);
ALTER TABLE public.gamification_userpoints
    ADD CONSTRAINT gamification_userpoints_related_challenge_id_fk FOREIGN KEY (related_challenge_id) REFERENCES public.challenges_challenge (id);
ALTER TABLE public.gamification_userpoints
    ADD CONSTRAINT gamification_userpoints_related_nutrition_plan_id_fk FOREIGN KEY (related_nutrition_plan_id) REFERENCES public.nutrition_nutritionplan (id);
ALTER TABLE public.gamification_userpoints
    ADD CONSTRAINT gamification_userpoints_reviewed_by_id_fk FOREIGN KEY (reviewed_by_id) REFERENCES public.accounts_user (id);

ALTER TABLE public.subscriptions_subscription
    ADD CONSTRAINT subscriptions_subscription_plan_id_fk FOREIGN KEY (plan_id) REFERENCES public.subscriptions_subscriptionplan (id);
ALTER TABLE public.subscriptions_subscription
    ADD CONSTRAINT subscriptions_subscription_owner_gym_id_fk FOREIGN KEY (owner_gym_id) REFERENCES public.gyms_gym (id);
ALTER TABLE public.subscriptions_subscription
    ADD CONSTRAINT subscriptions_subscription_owner_user_id_fk FOREIGN KEY (owner_user_id) REFERENCES public.accounts_user (id);

ALTER TABLE public.subscriptions_payment
    ADD CONSTRAINT subscriptions_payment_subscription_id_fk FOREIGN KEY (subscription_id) REFERENCES public.subscriptions_subscription (id);

END;
