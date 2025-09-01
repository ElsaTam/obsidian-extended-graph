import { ButtonComponent, ExtraButtonComponent } from "obsidian";
import { t } from "../internal";

const BUTTON_DELETE_CLASS: string = "extended-graph-delete-button";
const BUTTON_ADD_CLASS: string = "extended-graph-add-button";

export type ButtonType = 'add' | 'delete' | 'edit' | 'save';

export class UIElements {
    static setupButton(button: ButtonComponent, type: ButtonType) {
        switch (type) {
            case 'add':
                button.setClass(BUTTON_ADD_CLASS);
                button.setIcon('plus');
                button.setTooltip(t("controls.add"));
                break;
            case 'delete':
                button.setClass(BUTTON_DELETE_CLASS);
                button.setIcon('trash-2');
                button.setTooltip(t("controls.delete"));
                break;
            case 'edit':
                button.setIcon('pencil');
                button.setTooltip(t("controls.edit"));
                break;
            case 'save':
                button.setIcon('save');
                button.setTooltip(t("controls.save"));
                break;

            default:
                break;
        }
    }

    static setupExtraButton(extraButton: ExtraButtonComponent, type: ButtonType) {
        switch (type) {
            case 'add':
                extraButton.extraSettingsEl.addClass(BUTTON_ADD_CLASS);
                extraButton.setIcon('plus');
                extraButton.setTooltip(t("controls.add"));
                break;
            case 'delete':
                extraButton.extraSettingsEl.addClass(BUTTON_DELETE_CLASS);
                extraButton.setIcon('trash-2');
                extraButton.setTooltip(t("controls.delete"));
                break;
            case 'edit':
                extraButton.setIcon('pencil');
                extraButton.setTooltip(t("controls.edit"));
                break;
            case 'save':
                extraButton.setIcon('save');
                extraButton.setTooltip(t("controls.save"));
                break;

            default:
                break;
        }
    }
}