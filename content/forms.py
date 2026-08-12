from django import forms

from .models import UserProfile


class UserSettingsForm(forms.ModelForm):
    class Meta:
        model = UserProfile
        fields = ("preview_mode",)
        widgets = {
            "preview_mode": forms.RadioSelect(
                choices=UserProfile.PreviewMode.choices,
            ),
        }

    def __init__(self, *args, can_drive_preview=False, **kwargs):
        super().__init__(*args, **kwargs)
        self.can_drive_preview = can_drive_preview
        self.fields["preview_mode"].choices = [
            choice
            for choice in UserProfile.PreviewMode.choices
            if can_drive_preview or choice[0] == UserProfile.PreviewMode.PROXY
        ]

    def clean_preview_mode(self):
        mode = self.cleaned_data["preview_mode"]
        if mode == UserProfile.PreviewMode.DRIVE and not self.can_drive_preview:
            raise forms.ValidationError(
                "You do not have permission to use direct preview."
            )
        return mode
