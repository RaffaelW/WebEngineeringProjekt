import { Component } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatDialogModule } from "@angular/material/dialog";

@Component({
  selector: "confirm-delete-dialog",
  imports: [MatButtonModule, MatDialogModule],
  templateUrl: "./confirm-delete-dialog.html",
  styleUrl: "./confirm-delete-dialog.scss",
})
export class ConfirmDeleteDialog {}
