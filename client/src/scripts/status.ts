import $ from "jquery";
export function showStatus() {
    const status=$("#status")
    status.css("display","block");
}
export function closeStatus(){
    const status=$("#status")
    status.css("display","none");
}
(document.querySelector("#s-status") as HTMLButtonElement).onclick=showStatus;
(document.querySelector("#close-status-btn") as HTMLButtonElement).onclick=closeStatus;