/* ==========================================================
   효신책마루도서관 희망도서 신청
========================================================== */

const $ = (id) => document.getElementById(id);

const CONFIG = {
    storageKey: "libraryRequestDraft",
    maxPrice: 30000,
    gasUrl: "https://script.google.com/macros/s/AKfycbzmrrnfPBjvnz34QaOyfIkrpi4hB4Fxz-gvwxQjwAK_zs8Fi0VYR-ZDIu1AZ9bD2UDI/exec"
};

document.addEventListener("DOMContentLoaded", init);

function init() {

    initializeDate();

    initializeCharacterCounter();

    initializePriceCheck();

    initializeProgress();

    initializeUserType();

    initializeAutoSave();

    initializeResetButton();

    initializeSubmit();

}


/* ==========================================================
   날짜
========================================================== */

function initializeDate(){

    const today = new Date();

    $("requestDate").value =
        today.toISOString().slice(0,10);

    $("submitTime").value =
        today.toISOString();

}


/* ==========================================================
   진행률
========================================================== */

const requiredFields = [

    "studentName",

    "bookTitle",

    "reason"

];

function initializeProgress(){

    requiredFields.forEach(id=>{

        $(id).addEventListener("input",updateProgress);

        $(id).addEventListener("change",updateProgress);

    });

    updateProgress();

}

function updateProgress(){

    let fields=[

        "studentName",

        "bookTitle",

        "reason"

    ];

    const userType =
        document.querySelector('input[name="userType"]:checked').value;

    if(userType==="학생"){

        fields.push(

            "grade",

            "classroom",

            "number"

        );

    }

    let completed=0;

    fields.forEach(id=>{

        if($(id).value.trim()!==""){

            completed++;

        }

    });

    const percent=
        Math.round(completed/fields.length*100);

    $("progressFill").style.width=
        percent+"%";

    $("progressText").textContent=
        percent+"%";

    document
        .querySelector(".progress-bar")
        .setAttribute("aria-valuenow",percent);

    $("submitButton").disabled=
        percent!==100;

}

/* ==========================================================
   글자수
========================================================== */

function initializeCharacterCounter(){

    $("reason").addEventListener("input",()=>{

        $("textCounter").textContent =
        `${$("reason").value.length} / 300`;

    });

    $("opinion").addEventListener("input",()=>{

        $("opinionCounter").textContent =
        `${$("opinion").value.length} / 100`;

    });

}


/* ==========================================================
   가격
========================================================== */

function initializePriceCheck(){

    $("price").addEventListener("input",()=>{

        const value =
            Number($("price").value);

        if(!value){

            $("priceMessage").textContent="";

            return;

        }

        if(value > CONFIG.maxPrice){

            $("priceMessage").textContent =
            `⚠ ${CONFIG.maxPrice.toLocaleString()}원 이하만 신청 가능합니다.`;

        }

        else{

            $("priceMessage").textContent="";

        }

    });

}


/* ==========================================================
   LocalStorage
========================================================== */

function initializeAutoSave(){

    const fields =
    document.querySelectorAll(

        "#requestForm input,#requestForm select,#requestForm textarea"

    );

    loadDraft();

    fields.forEach(field=>{

        if(field.type==="hidden") return;

        field.addEventListener("input",saveDraft);

        field.addEventListener("change",saveDraft);

    });

}

function saveDraft(){

    const data={};

    document.querySelectorAll(

        "#requestForm input,#requestForm select,#requestForm textarea"

    ).forEach(field=>{

        if(field.type==="hidden") return;

        if(field.type==="radio"){

            if(field.checked){

                data[field.name]=field.value;

            }

        }

        else{

            data[field.id]=field.value;

        }

    });

    localStorage.setItem(

        CONFIG.storageKey,

        JSON.stringify(data)

    );

}

function loadDraft(){

    const draft =
    localStorage.getItem(CONFIG.storageKey);

    if(!draft) return;

    const data = JSON.parse(draft);

    Object.keys(data).forEach(key=>{
 if(key === "requestDate") return;
        const element = $(key);

        if(element){

            element.value = data[key];

        }

        const radio =
        document.querySelector(

            `input[name="${key}"][value="${data[key]}"]`

        );

        if(radio){

            radio.checked=true;

        }

    });

    updateProgress();

}


/* ==========================================================
   Reset
========================================================== */

function initializeResetButton(){

    $("resetButton").onclick=()=>{

        $("resetModal").classList.add("show");

    };

    $("cancelReset").onclick=()=>{

        $("resetModal").classList.remove("show");

    };

    $("confirmReset").onclick=()=>{

        localStorage.removeItem(CONFIG.storageKey);

        $("requestForm").reset();

        initializeDate();

        updateProgress();

        $("textCounter").textContent = "0 / 300";

        $("opinionCounter").textContent = "0 / 100";

        $("priceMessage").textContent = "";

        $("resetModal").classList.remove("show");

        showToast("작성 내용이 삭제되었습니다.");

    };

}


/* ==========================================================
   Submit
========================================================== */

function initializeSubmit(){

    $("requestForm").addEventListener(

        "submit",

        submitForm

    );

    $("successConfirm").onclick=()=>{

        $("successModal").classList.remove("show");

        $("requestForm").reset();

        initializeDate();

        updateProgress();

        $("textCounter").textContent="0 / 300";

        $("opinionCounter").textContent="0 / 100";

    };

}



async function submitForm(e){

    e.preventDefault();

    const button = $("submitButton");

    button.classList.add("loading");
    button.disabled = true;

    try{

        const result = await sendToGoogleSheet();

        console.log("접수번호 :", result.requestId);

        localStorage.removeItem(CONFIG.storageKey);

        $("successModal").classList.add("show");

    }

    catch(error){

        console.error(error);

        showToast("신청 중 오류가 발생했습니다.");

    }

finally{

    button.classList.remove("loading");

    button.disabled = false;

    updateProgress();

}

}


/* ==========================================================
   Google Sheets
========================================================== */

async function sendToGoogleSheet() {

    const formData = new FormData($("requestForm"));
    const data = Object.fromEntries(formData.entries());

    data.requestId = Date.now().toString();
    data.submitTime = new Date().toISOString();

    const response = await fetch(CONFIG.gasUrl, {
        method: "POST",
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        throw new Error("서버와 통신하지 못했습니다.");
    }

    const json = await response.json();

    if (json.result !== "success") {
        throw new Error(json.message || "저장 실패");
    }

    return json;
}

/* ==========================================================
   Toast
========================================================== */

function showToast(message){

    const toast = $("toast");

    toast.textContent=message;

    toast.classList.add("show");

    setTimeout(()=>{

        toast.classList.remove("show");

    },2500);

}
/* ==========================================================
   신청자 구분
========================================================== */

function initializeUserType(){

    const radios =
        document.querySelectorAll('input[name="userType"]');

    radios.forEach(radio=>{

        radio.addEventListener("change",changeUserType);

    });

    changeUserType();

}

function changeUserType(){

    const userType =
        document.querySelector('input[name="userType"]:checked').value;

    const studentFields =
        $("studentFields");

    const teacherFields =
        $("teacherFields");

    const grade =
        $("grade");

    const classroom =
        $("classroom");

    const number =
        $("number");

    document
        .querySelectorAll(".type-card")
        .forEach(card=>card.classList.remove("selected"));

    document
        .querySelector('input[name="userType"]:checked')
        .closest(".type-card")
        .classList.add("selected");

    if(userType==="학생"){

        studentFields.classList.remove("hidden");

        teacherFields.classList.add("hidden");

        grade.required=true;

        classroom.required=true;

        number.required=true;

    }

    else{

        studentFields.classList.add("hidden");

        teacherFields.classList.remove("hidden");

        grade.required=false;

        classroom.required=false;

        number.required=false;

        grade.value="";

        classroom.value="";

        number.value="";

    }

    updateProgress();

}
