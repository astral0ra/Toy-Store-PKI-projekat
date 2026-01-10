import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-login-warning-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './login-warning-dialog.html'
})
export class LoginWarningDialog {
  constructor(
    public dialogRef: MatDialogRef<LoginWarningDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { action: string; }
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }
}
