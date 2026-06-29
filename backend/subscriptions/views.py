import logging
from datetime import date, timedelta
from io import BytesIO

from django.http import HttpResponse
from django.db.models import Sum

logger = logging.getLogger(__name__)
from django.db.models.functions import TruncMonth
from rest_framework import permissions, status, viewsets, filters
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .models import Payment, Subscription, SubscriptionPlan
from .serializers import PaymentSerializer, SubscriptionPlanSerializer, SubscriptionSerializer


class SubscriptionPlanViewSet(viewsets.ModelViewSet):
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["display_order", "price", "name", "created_at"]
    ordering = ["display_order", "price"]

    def get_queryset(self):
        queryset = SubscriptionPlan.objects.all()
        if self.request.user.is_authenticated and self.request.user.role == self.request.user.Role.SUPER_ADMIN:
            return queryset
        return queryset.filter(is_active=True)

    def has_admin_permission(self):
        return self.request.user.is_authenticated and self.request.user.role == self.request.user.Role.SUPER_ADMIN

    def perform_create(self, serializer):
        if not self.has_admin_permission():
            raise PermissionDenied("Solo los super administradores pueden crear planes.")
        serializer.save()

    def perform_update(self, serializer):
        if not self.has_admin_permission():
            raise PermissionDenied("Solo los super administradores pueden modificar planes.")
        serializer.save()

    def perform_destroy(self, instance):
        if not self.has_admin_permission():
            raise PermissionDenied("Solo los super administradores pueden archivar planes.")
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])

    @action(detail=True, methods=["delete"])
    def hard_delete(self, request, pk=None):
        if not self.has_admin_permission():
            raise PermissionDenied("Solo los super administradores pueden eliminar planes.")
        plan = self.get_object()
        if plan.subscriptions.exists():
            return Response(
                {"detail": "No puedes eliminar este plan porque tiene suscripciones activas. Por favor, archívalo en su lugar."},
                status=status.HTTP_400_BAD_REQUEST
            )
        plan.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        if not self.has_admin_permission():
            raise PermissionDenied("Solo los super administradores pueden ordenar planes.")
        
        orders = request.data
        if not isinstance(orders, list):
            return Response({"detail": "Se esperaba una lista de objetos con id y display_order."}, status=status.HTTP_400_BAD_REQUEST)
        
        from django.db import transaction
        with transaction.atomic():
            for item in orders:
                plan_id = item.get("id")
                order = item.get("display_order")
                if plan_id is not None and order is not None:
                    SubscriptionPlan.objects.filter(id=plan_id).update(display_order=order)
        
        return Response({"detail": "Orden actualizado exitosamente."})


class SubscriptionViewSet(viewsets.ModelViewSet):
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["owner_gym__name", "plan__name", "owner_user__email"]
    ordering_fields = ["start_date", "next_billing_date", "plan__price"]
    ordering = ["-start_date"]

    def get_queryset(self):
        user = self.request.user
        queryset = Subscription.objects.select_related("plan", "owner_gym", "owner_user")

        filter_status = self.request.query_params.get("status")
        if filter_status:
            queryset = queryset.filter(status=filter_status)

        filter_plan = self.request.query_params.get("plan")
        if filter_plan:
            queryset = queryset.filter(plan_id=filter_plan)

        if user.role == user.Role.SUPER_ADMIN:
            return queryset
        if user.role == user.Role.GYM_ADMIN and user.gym_id:
            return queryset.filter(owner_gym=user.gym)
        return queryset.filter(owner_user=user)

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in [user.Role.SUPER_ADMIN, user.Role.GYM_ADMIN]:
            raise PermissionDenied("No tienes permisos para crear suscripciones.")
        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        if user.role == user.Role.SUPER_ADMIN:
            serializer.save()
            return
        if instance.owner_gym_id and user.role == user.Role.GYM_ADMIN and instance.owner_gym_id == user.gym_id:
            serializer.save()
            return
        if instance.owner_user_id == user.id:
            serializer.save(owner_user=user)
            return
        raise PermissionDenied("No puedes modificar esta suscripción.")

    def perform_destroy(self, instance):
        if self.request.user.role != self.request.user.Role.SUPER_ADMIN:
            raise PermissionDenied("Solo super_admin puede eliminar suscripciones.")
        instance.delete()

    @action(detail=True, methods=["post"])
    def change_plan(self, request, pk=None):
        """Cambiar el plan de una suscripción activa"""
        subscription = self.get_object()
        if subscription.status not in ["active", "past_due"]:
            return Response(
                {"detail": "Solo se puede cambiar el plan de suscripciones activas o con pago atrasado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_plan_id = request.data.get("plan_id")
        if not new_plan_id:
            return Response({"detail": "Se requiere plan_id."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            new_plan = SubscriptionPlan.objects.get(id=new_plan_id, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            return Response({"detail": "Plan no encontrado o inactivo."}, status=status.HTTP_404_NOT_FOUND)

        old_plan_name = subscription.plan.name
        subscription.plan = new_plan
        subscription.save(update_fields=["plan", "updated_at"])

        # Registrar cambio de plan (para auditoría)
        logger.info("Cambio de plan: %s cambió de %s a %s", subscription.owner_gym, old_plan_name, new_plan.name)

        return Response({
            "detail": f"Plan cambiado de {old_plan_name} a {new_plan.name} exitosamente.",
            "subscription": self.get_serializer(subscription).data,
        })

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """Cancelar suscripción al final del período actual"""
        subscription = self.get_object()
        if subscription.status != "active":
            return Response({"detail": "La suscripción no está activa."}, status=status.HTTP_400_BAD_REQUEST)

        subscription.cancel_at_period_end = True
        subscription.save(update_fields=["cancel_at_period_end", "updated_at"])

        return Response({
            "detail": "La suscripción se cancelará al final del período actual.",
            "subscription": self.get_serializer(subscription).data,
        })

    @action(detail=True, methods=["post"])
    def renew(self, request, pk=None):
        """Reactivar suscripción cancelada o renovar período"""
        subscription = self.get_object()

        if subscription.cancel_at_period_end:
            subscription.cancel_at_period_end = False
            subscription.save(update_fields=["cancel_at_period_end", "updated_at"])
            return Response({
                "detail": "Cancelación revertida. La suscripción continuará activa.",
                "subscription": self.get_serializer(subscription).data,
            })

        if subscription.status == "canceled":
            from datetime import date, timedelta
            subscription.status = "active"
            subscription.start_date = date.today()
            subscription.end_date = None
            subscription.next_billing_date = date.today() + timedelta(days=30)
            subscription.cancel_at_period_end = False
            subscription.save(update_fields=[
                "status", "start_date", "end_date",
                "next_billing_date", "cancel_at_period_end", "updated_at"
            ])
            return Response({
                "detail": "Suscripción reactivada exitosamente.",
                "subscription": self.get_serializer(subscription).data,
            })

        return Response(
            {"detail": "Esta suscripción ya está activa."},
            status=status.HTTP_400_BAD_REQUEST,
        )


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "subscription__owner_gym__name",
        "subscription__plan__name",
        "external_id",
    ]
    ordering_fields = ["paid_at", "amount", "status"]
    ordering = ["-paid_at"]

    def get_queryset(self):
        user = self.request.user
        qs = Payment.objects.select_related(
            "subscription",
            "subscription__plan",
            "subscription__owner_gym",
        )

        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        gym_id = self.request.query_params.get("gym")
        if gym_id:
            qs = qs.filter(subscription__owner_gym_id=gym_id)

        date_from = self.request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(paid_at__date__gte=date_from)

        date_to = self.request.query_params.get("date_to")
        if date_to:
            qs = qs.filter(paid_at__date__lte=date_to)

        if user.role == user.Role.SUPER_ADMIN:
            return qs
        if user.role == user.Role.GYM_ADMIN and user.gym_id:
            return qs.filter(subscription__owner_gym=user.gym)
        return qs.filter(subscription__owner_user=user)

    def perform_create(self, serializer):
        if self.request.user.role != self.request.user.Role.SUPER_ADMIN:
            raise PermissionDenied("No tienes permisos para registrar pagos.")
        serializer.save()

    def perform_destroy(self, instance):
        raise PermissionDenied("No puedes eliminar pagos.")

    @action(detail=False, methods=["get"])
    def metrics(self, request):
        today = date.today()
        first_day_of_month = today.replace(day=1)
        last_month_start = (first_day_of_month - timedelta(days=1)).replace(day=1)

        mrr = (
            Subscription.objects
            .filter(status="active")
            .aggregate(total=Sum("plan__price"))
        )["total"] or 0

        monthly_income = (
            Payment.objects
            .filter(status="success", paid_at__date__gte=first_day_of_month)
            .aggregate(total=Sum("amount"))
        )["total"] or 0

        last_month_income = (
            Payment.objects
            .filter(
                status="success",
                paid_at__date__gte=last_month_start,
                paid_at__date__lt=first_day_of_month,
            )
            .aggregate(total=Sum("amount"))
        )["total"] or 0

        mrr_change = 0
        if last_month_income > 0:
            mrr_change = round((float(monthly_income) - float(last_month_income)) / float(last_month_income) * 100, 1)

        pending = Payment.objects.filter(status="pending").count()
        total_gyms = (
            Subscription.objects
            .filter(status="active")
            .values("owner_gym")
            .distinct()
            .count()
        )

        return Response({
            "mrr": float(mrr),
            "arr": float(mrr) * 12,
            "monthly_income": float(monthly_income),
            "mrr_change": mrr_change,
            "pending_payments": pending,
            "total_gyms_with_subscriptions": total_gyms,
            "currency": "PEN",
        })

    @action(detail=True, methods=["get"])
    def invoice(self, request, pk=None):
        """Genera un comprobante de pago en PDF."""
        payment = self.get_object()
        sub = payment.subscription
        gym = sub.owner_gym

        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.units import cm
            from reportlab.lib import colors
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
        except ImportError:
            return Response({"detail": "reportlab no está instalado."}, status=500)

        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2 * cm,
            leftMargin=2 * cm,
            topMargin=2 * cm,
            bottomMargin=2 * cm,
        )

        # ── Estilos ──────────────────────────────────────────────────────────
        styles = getSampleStyleSheet()
        GREEN = colors.HexColor("#10b981")
        DARK = colors.HexColor("#0f172a")
        GRAY = colors.HexColor("#64748b")
        LIGHT = colors.HexColor("#f8fafc")

        style_h1 = ParagraphStyle("h1", fontSize=26, textColor=DARK, fontName="Helvetica-Bold", spaceAfter=2)
        style_sub = ParagraphStyle("sub", fontSize=10, textColor=GRAY, fontName="Helvetica")
        style_label = ParagraphStyle("label", fontSize=8, textColor=GRAY, fontName="Helvetica", spaceAfter=2, leading=12)
        style_value = ParagraphStyle("value", fontSize=10, textColor=DARK, fontName="Helvetica-Bold", leading=14)
        style_center = ParagraphStyle("center", fontSize=9, textColor=GRAY, fontName="Helvetica", alignment=TA_CENTER)
        style_amount = ParagraphStyle("amount", fontSize=22, textColor=GREEN, fontName="Helvetica-Bold", alignment=TA_RIGHT)
        style_currency = ParagraphStyle("currency", fontSize=10, textColor=GRAY, fontName="Helvetica", alignment=TA_RIGHT)

        # ── Número de comprobante ─────────────────────────────────────────────
        short_id = str(payment.id).replace("-", "").upper()[:10]
        invoice_number = f"LF-{short_id}"
        paid_at_str = payment.paid_at.strftime("%d/%m/%Y") if payment.paid_at else "—"
        status_label = {"success": "PAGADO", "pending": "PENDIENTE", "failed": "FALLIDO"}.get(payment.status, payment.status.upper())
        status_color = {"success": colors.HexColor("#10b981"), "pending": colors.HexColor("#f59e0b"), "failed": colors.HexColor("#ef4444")}.get(payment.status, GRAY)

        story = []

        # ── HEADER: LifeFit + número ──────────────────────────────────────────
        style_brand = ParagraphStyle("brand", fontSize=28, textColor=DARK, fontName="Helvetica-Bold", leading=32, spaceAfter=0)
        style_tagline = ParagraphStyle("tagline", fontSize=9, textColor=GRAY, fontName="Helvetica", leading=13, spaceAfter=0)
        style_inv_label = ParagraphStyle("inv_label", fontSize=9, textColor=GREEN, fontName="Helvetica-Bold", alignment=TA_RIGHT, leading=13)
        style_inv_num = ParagraphStyle("inv_num", fontSize=15, textColor=DARK, fontName="Helvetica-Bold", alignment=TA_RIGHT, leading=20)

        header_data = [[
            Table(
                [[Paragraph("LifeFit", style_brand)],
                 [Paragraph("Plataforma de gestión para gimnasios", style_tagline)]],
                colWidths=[9 * cm],
                style=TableStyle([
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ]),
            ),
            Table(
                [[Paragraph("COMPROBANTE DE PAGO", style_inv_label)],
                 [Paragraph(invoice_number, style_inv_num)]],
                colWidths=[8 * cm],
                style=TableStyle([
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ]),
            ),
        ]]
        header_table = Table(header_data, colWidths=[9 * cm, 8 * cm])
        header_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 0.5 * cm))
        story.append(HRFlowable(width="100%", thickness=1.5, color=GREEN))
        story.append(Spacer(1, 0.6 * cm))

        # ── ESTADO + FECHA ────────────────────────────────────────────────────
        meta_data = [
            [
                Paragraph("FECHA DE PAGO", style_label),
                Paragraph("ESTADO", style_label),
                Paragraph("MÉTODO", style_label),
            ],
            [
                Paragraph(paid_at_str, style_value),
                Paragraph(f"<font color='{status_color.hexval() if hasattr(status_color, 'hexval') else '#10b981'}'><b>{status_label}</b></font>", style_value),
                Paragraph(payment.provider.upper() if payment.provider else "MANUAL", style_value),
            ],
        ]
        meta_table = Table(meta_data, colWidths=[6 * cm, 5 * cm, 6 * cm])
        meta_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
            ("ROWPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ("ROUNDEDCORNERS", [4]),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 0.8 * cm))

        # ── DATOS DEL GIMNASIO ────────────────────────────────────────────────
        story.append(Paragraph("FACTURADO A", ParagraphStyle("sec", fontSize=8, textColor=GREEN, fontName="Helvetica-Bold", spaceAfter=6, leading=14)))

        gym_name = gym.name if gym else (sub.owner_user.get_full_name() if sub.owner_user else "—")
        gym_ruc = gym.ruc if gym and gym.ruc else "Sin RUC"
        gym_location = gym.location if gym and gym.location else "—"
        gym_email = gym.contact_email if gym and gym.contact_email else "—"

        gym_data = [
            [Paragraph(f"<b>{gym_name}</b>", ParagraphStyle("gname", fontSize=13, textColor=DARK, fontName="Helvetica-Bold")), ""],
            [Paragraph(f"RUC: {gym_ruc}", style_sub), Paragraph(f"Email: {gym_email}", style_sub)],
            [Paragraph(f"Dirección: {gym_location}", style_sub), ""],
        ]
        gym_table = Table(gym_data, colWidths=[9 * cm, 8 * cm])
        gym_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        story.append(gym_table)
        story.append(Spacer(1, 0.8 * cm))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0")))
        story.append(Spacer(1, 0.6 * cm))

        # ── DETALLE DEL PLAN ──────────────────────────────────────────────────
        story.append(Paragraph("DETALLE DEL SERVICIO", ParagraphStyle("sec2", fontSize=8, textColor=GREEN, fontName="Helvetica-Bold", spaceAfter=8, leading=14)))

        billing_map = {"monthly": "Mensual", "quarterly": "Trimestral", "annual": "Anual", "custom": "Personalizado"}
        billing = billing_map.get(sub.plan.billing_cycle, sub.plan.billing_cycle)
        period_start = sub.start_date.strftime("%d/%m/%Y") if sub.start_date else "—"
        period_end = sub.next_billing_date.strftime("%d/%m/%Y") if sub.next_billing_date else "—"

        detail_data = [
            [
                Paragraph("<b>DESCRIPCIÓN</b>", ParagraphStyle("th", fontSize=8, textColor=GRAY, fontName="Helvetica-Bold")),
                Paragraph("<b>PERÍODO</b>", ParagraphStyle("th", fontSize=8, textColor=GRAY, fontName="Helvetica-Bold", alignment=TA_CENTER)),
                Paragraph("<b>CICLO</b>", ParagraphStyle("th", fontSize=8, textColor=GRAY, fontName="Helvetica-Bold", alignment=TA_CENTER)),
                Paragraph("<b>IMPORTE</b>", ParagraphStyle("th", fontSize=8, textColor=GRAY, fontName="Helvetica-Bold", alignment=TA_RIGHT)),
            ],
            [
                Paragraph(f"<b>Plan {sub.plan.name}</b><br/><font size='8' color='#64748b'>{sub.plan.description[:80] if sub.plan.description else 'Suscripción LifeFit'}</font>",
                          ParagraphStyle("desc", fontSize=10, textColor=DARK, fontName="Helvetica", leading=14)),
                Paragraph(f"{period_start}<br/>al {period_end}", ParagraphStyle("per", fontSize=9, textColor=DARK, fontName="Helvetica", alignment=TA_CENTER, leading=14)),
                Paragraph(billing, ParagraphStyle("cyc", fontSize=9, textColor=DARK, fontName="Helvetica", alignment=TA_CENTER)),
                Paragraph(f"S/ {float(payment.amount):,.2f}", ParagraphStyle("amt", fontSize=10, textColor=DARK, fontName="Helvetica-Bold", alignment=TA_RIGHT)),
            ],
        ]
        detail_table = Table(detail_data, colWidths=[7.5 * cm, 3.5 * cm, 2.5 * cm, 3.5 * cm])
        detail_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
            ("ROWPADDING", (0, 0), (-1, -1), 10),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.HexColor("#e2e8f0")),
            ("LINEBELOW", (0, -1), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(detail_table)
        story.append(Spacer(1, 0.6 * cm))

        # ── TOTAL ─────────────────────────────────────────────────────────────
        total_data = [
            [
                "",
                Paragraph("SUBTOTAL", ParagraphStyle("tl", fontSize=9, textColor=GRAY, fontName="Helvetica", alignment=TA_RIGHT)),
                Paragraph(f"S/ {float(payment.amount):,.2f}", ParagraphStyle("tv", fontSize=9, textColor=DARK, fontName="Helvetica", alignment=TA_RIGHT)),
            ],
            [
                "",
                Paragraph("IGV (18%)", ParagraphStyle("tl", fontSize=9, textColor=GRAY, fontName="Helvetica", alignment=TA_RIGHT)),
                Paragraph("Incluido", ParagraphStyle("tv", fontSize=9, textColor=GRAY, fontName="Helvetica", alignment=TA_RIGHT)),
            ],
            [
                "",
                Paragraph("<b>TOTAL A PAGAR</b>", ParagraphStyle("tl", fontSize=11, textColor=DARK, fontName="Helvetica-Bold", alignment=TA_RIGHT)),
                Paragraph(f"<b>S/ {float(payment.amount):,.2f}</b>", ParagraphStyle("tv", fontSize=14, textColor=GREEN, fontName="Helvetica-Bold", alignment=TA_RIGHT)),
            ],
        ]
        total_table = Table(total_data, colWidths=[9.5 * cm, 4 * cm, 3.5 * cm])
        total_table.setStyle(TableStyle([
            ("ROWPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("LINEABOVE", (1, 2), (-1, 2), 1, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 2), (-1, 2), 10),
        ]))
        story.append(total_table)
        story.append(Spacer(1, 1.5 * cm))

        # ── REFERENCIA ────────────────────────────────────────────────────────
        if payment.external_id:
            story.append(Paragraph(f"Referencia de transacción: <b>{payment.external_id}</b>", style_center))
            story.append(Spacer(1, 0.3 * cm))

        # ── FOOTER ────────────────────────────────────────────────────────────
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0")))
        story.append(Spacer(1, 0.4 * cm))
        story.append(Paragraph(
            "Este documento es un comprobante interno emitido por LifeFit · No tiene validez tributaria oficial · lifefit.app",
            style_center,
        ))

        # ── Generar PDF ───────────────────────────────────────────────────────
        doc.build(story)
        buffer.seek(0)

        filename = f"comprobante-lifefit-{invoice_number}.pdf"
        response = HttpResponse(buffer.read(), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=["get"])
    def revenue_history(self, request):
        six_months_ago = date.today() - timedelta(days=180)
        monthly = (
            Payment.objects
            .filter(status="success", paid_at__date__gte=six_months_ago)
            .annotate(month=TruncMonth("paid_at"))
            .values("month")
            .annotate(total=Sum("amount"))
            .order_by("month")
        )
        return Response([
            {"month": m["month"].strftime("%Y-%m"), "total": float(m["total"])}
            for m in monthly
        ])
