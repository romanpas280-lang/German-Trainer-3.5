// ==========================
// German Trainer 3.4.2
// ==========================

// ---------- DOM Elements ----------
const newFolderBtn = document.getElementById("newFolderBtn");
const newTextBtn = document.getElementById("newTextBtn");
const folderTree = document.getElementById("folderTree");
const textInput = document.getElementById("textInput");
const textViewer = document.getElementById("textViewer");

// ---------- STATE ----------
let data = JSON.parse(localStorage.getItem("germanTrainerData")) || {
    id: generateId(),
    type: "folder",
    name: "Мої тексти",
    children: []
};
let selectedNode = data;
let draggedNode = null;

// ---------- INIT ----------
renderTree();
selectNode(data);

// ---------- UTIL ----------
function generateId() { return "_" + Math.random().toString(36).substr(2,9); }
function save() { localStorage.setItem("germanTrainerData", JSON.stringify(data)); }

// ---------- TREE RENDER ----------
function renderTree(){
    folderTree.innerHTML="";
    folderTree.appendChild(createNodeElement(data));
}

function createNodeElement(node){
    const li=document.createElement("li");

    const spanText=document.createElement("span");
    spanText.textContent=node.name;
    li.appendChild(spanText);
    spanText.onclick=(e)=>{ e.stopPropagation(); selectNode(node); };

    const menuBtn=document.createElement("button");
    menuBtn.textContent="⋮";
    menuBtn.onclick=(e)=>{ e.stopPropagation(); showNodeMenu(menuBtn,node); };
    li.appendChild(menuBtn);

    // Drag & Drop
    li.setAttribute("draggable", node.type!=="root");
    li.addEventListener("dragstart", (e)=>{ draggedNode=node; e.dataTransfer.setData("text/plain",""); li.style.opacity="0.5"; });
    li.addEventListener("dragend", ()=>{ draggedNode=null; li.style.opacity="1"; });
    li.addEventListener("dragover",(e)=>{ e.preventDefault(); li.style.background="#444"; });
    li.addEventListener("dragleave",()=>{ li.style.background="#222"; });
    li.addEventListener("drop",(e)=>{
        e.stopPropagation(); li.style.background="#222";
        if(!draggedNode || node.type!=="folder" || draggedNode===node) return;
        const parent=findParent(data, draggedNode.id);
        if(!parent) return;
        parent.children=parent.children.filter(c=>c.id!==draggedNode.id);
        if(!node.children) node.children=[];
        node.children.push(draggedNode);
        save(); renderTree();
    });

    // Children
    if(node.children && node.children.length>0){
        const ul=document.createElement("ul");
        ul.style.listStyle="none";
        ul.style.paddingLeft="16px";
        node.children.forEach(child=>{ ul.appendChild(createNodeElement(child)); });
        li.appendChild(ul);
    }

    return li;
}

// ---------- SELECT NODE ----------
function selectNode(node){
    selectedNode=node;
    if(node.type==="text"){
        textInput.value=node.content||"";
        renderViewer(node.content||"");
    } else {
        textInput.value="";
        textViewer.innerHTML="";
    }
}

// ---------- ADD ----------
newFolderBtn.onclick = ()=>{
    if(!selectedNode || selectedNode.type!=="folder") return;
    const newFolder={id:generateId(), type:"folder", name:"Нова папка", children:[]};
    selectedNode.children.push(newFolder);
    save(); renderTree(); selectNode(newFolder);
};
newTextBtn.onclick = ()=>{
    if(!selectedNode || selectedNode.type!=="folder") return;
    const newText={id:generateId(), type:"text", name:"Новий текст", content:""};
    selectedNode.children.push(newText);
    save(); renderTree(); selectNode(newText);
};

// ---------- EDITOR AUTOSAVE ----------
textInput.addEventListener("input", ()=>{
    if(selectedNode && selectedNode.type==="text"){
        selectedNode.content=textInput.value;
        save(); renderViewer(selectedNode.content);
    }
});

// ---------- PARSE WORDS ----------
function parseWords(text){
    const regex=/(\S+?)\[(.*?)\|(.*?)\]/g;
    let lastIndex=0; let match; const words=[];
    while((match=regex.exec(text))!==null){
        words.push({word:match[1], reading:match[2], translation:match[3], index:match.index});
    }
    return words;
}

// ---------- VIEWER ----------
function renderViewer(text){
    textViewer.innerHTML="";
    if(!text) return;

    const words=parseWords(text);
    let lastIndex=0;

    words.forEach(w=>{
        if(w.index>lastIndex){
            textViewer.appendChild(document.createTextNode(text.slice(lastIndex,w.index)));
        }

        const span=document.createElement("span");
        span.textContent=w.word;
        span.style.cursor="pointer";
        span.style.borderBottom="1px dotted #888";

        span.onclick=(e)=>{
            e.stopPropagation();
            const oldTip=document.getElementById("wordTooltip"); if(oldTip) oldTip.remove();

            const tip=document.createElement("div");
            tip.id="wordTooltip";
            tip.textContent=`${w.reading} — ${w.translation}`;
            tip.style.position="absolute"; tip.style.background="#222"; tip.style.color="#fff";
            tip.style.border="1px solid #888"; tip.style.borderRadius="4px"; tip.style.padding="2px 6px";
            tip.style.fontSize="13px"; tip.style.zIndex=9999;

            const rect=e.target.getBoundingClientRect();
            tip.style.top=rect.top+window.scrollY-28+"px";
            tip.style.left=rect.left+window.scrollX+"px";

            document.body.appendChild(tip);

            // озвучення
            const utter=new SpeechSynthesisUtterance(w.word);
            utter.lang="de-DE";
            speechSynthesis.speak(utter);

            const removeTip=(ev)=>{
                if(!tip.contains(ev.target)) tip.remove();
                document.removeEventListener("click",removeTip);
            };
            document.addEventListener("click",removeTip);
        };

        textViewer.appendChild(span);
        lastIndex=w.index+w.word.length+w.reading.length+w.translation.length+3;
    });

    if(lastIndex<text.length){
        textViewer.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
}

// ---------- MENU 3 DOTS ----------
function showNodeMenu(button,node){
    const oldMenu=document.getElementById("nodeMenuTooltip"); if(oldMenu) oldMenu.remove();
    const menu=document.createElement("div"); menu.id="nodeMenuTooltip";
    menu.style.position="absolute"; menu.style.background="#222"; menu.style.color="#fff";
    menu.style.border="1px solid #888"; menu.style.borderRadius="6px"; menu.style.padding="4px 0";
    menu.style.minWidth="120px"; menu.style.zIndex=9999; menu.style.fontSize="14px";

    const rect=button.getBoundingClientRect();
    menu.style.top=rect.bottom+window.scrollY+"px";
    menu.style.left=rect.left+window.scrollX+"px";

    const rename=document.createElement("div"); rename.textContent="Змінити назву";
    rename.style.padding="6px 12px"; rename.style.cursor="pointer";
    rename.onmouseenter=()=>rename.style.background="#444"; rename.onmouseleave=()=>rename.style.background="transparent";
    rename.onclick=()=>{
        const newName=prompt("Введіть нову назву:",node.name);
        if(newName && newName.trim()!==""){ node.name=newName.trim(); save(); renderTree(); }
        menu.remove();
    }; menu.appendChild(rename);

    if(node.id!==data.id){
        const del=document.createElement("div"); del.textContent="Видалити";
        del.style.padding="6px 12px"; del.style.cursor="pointer";
        del.onmouseenter=()=>del.style.background="#600"; del.onmouseleave=()=>del.style.background="transparent";
        del.onclick=()=>{
            const parent=findParent(data,node.id); if(!parent) return;
            if(confirm(`Видалити "${node.name}"?`)){
                parent.children=parent.children.filter(c=>c.id!==node.id);
                if(selectedNode && selectedNode.id===node.id) selectNode(parent);
                save(); renderTree();
            } menu.remove();
        }; menu.appendChild(del);
    }

    document.body.appendChild(menu);
    const removeMenu=(e)=>{ if(!menu.contains(e.target) && e.target!==button) menu.remove(); document.removeEventListener("click",removeMenu); };
    document.addEventListener("click",removeMenu);
}

// ---------- FIND PARENT ----------
function findParent(currentNode,id){
    if(!currentNode.children) return null;
    for(const child of currentNode.children){
        if(child.id===id) return currentNode;
        const deeper=findParent(child,id);
        if(deeper) return deeper;
    }
    return null;
}