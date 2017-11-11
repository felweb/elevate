import { NgModule } from '@angular/core';
import {
	MatButtonModule,
	MatCardModule,
	MatCheckboxModule,
	MatDialogModule,
	MatGridListModule,
	MatIconModule,
	MatInputModule,
	MatListModule,
	MatMenuModule,
	MatOptionModule,
	MatSelectModule,
	MatSidenavModule,
	MatSlideToggleModule,
	MatSnackBarModule,
	MatTableModule,
	MatToolbarModule,
	MatTooltipModule
} from '@angular/material';
import { CdkTableModule } from "@angular/cdk/table";

@NgModule({
	imports: [
		MatButtonModule,
		MatSnackBarModule,
		MatCheckboxModule,
		MatSelectModule,
		MatOptionModule,
		MatInputModule,
		MatMenuModule,
		MatTooltipModule,
		MatIconModule,
		MatToolbarModule,
		MatSidenavModule,
		MatDialogModule,
		MatCardModule,
		MatListModule,
		MatTableModule,
		CdkTableModule,
		MatGridListModule,
		MatSlideToggleModule
	],
	exports: [
		MatButtonModule,
		MatSnackBarModule,
		MatCheckboxModule,
		MatSelectModule,
		MatOptionModule,
		MatInputModule,
		MatMenuModule,
		MatTooltipModule,
		MatIconModule,
		MatToolbarModule,
		MatSidenavModule,
		MatDialogModule,
		MatCardModule,
		MatListModule,
		MatTableModule,
		CdkTableModule,
		MatGridListModule,
		MatSlideToggleModule
	],
	declarations: []
})

export class MaterialModule {
}
