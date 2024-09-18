let currentQuestion = 0;
let habilitations = [];
let currentIndice = null;  // Variable pour stocker l'indice actuel
let employeeNames = [];
let userName = "";
let companyName = "";
let contactMail ="";
let contactPhone = "";
let affirmations = [];

const questions = [
     {
        question: "Le salarié est-il amené à intervenir sur des installations électriques ou seulement à proximité, sans intervenir directement ?", //0
        type: "multiple",
        options: ["sur des installations électriques", "à proximité"],
        answerAffirmative: [ 
            "Le salarié intervient sur des installations électriques en basse tension.", 
            "Le salarié n'intervient qu'à proximité des installations électriques."
        ],
        result: ["", "B0"],
        next: [1, 6]
    },
    {
        question: "Le salarié est-il amené à remplacer / dépanner / connecter / installer des éléments électriques en basse tension (BT) lors de travaux de construction / rénovation, au sein d'une équipe de plusieurs personnes ?", //1
        type: "multiple",
        options: ["Oui", "Non"],
        answerAffirmative: [
            "Le salarié effectue des opérations sur des équipements basse tension.",
            "Le salarié ne fait aucune intervention sur des équipements basse tension."
        ],
        result: ["", ""],
        next: [2, 6]
    },
    {
        question: "Le salarié agit-il en tant qu'exécutant ou agent de maitrise / cadre ?", //2
        type: "multiple",
        options: ["Exécutant", "agent de Maîtrise / cadre"],
        answerAffirmative: [
            "Le salarié agit en tant qu'exécutant.",
            "Le salarié agit en tant qu'agent de maîtrise ou cadre."
        ],
        result: ["", ""],
        next: [3, 4]
    },
    {
        question: "Le salarié travaille-t-il dans des armoires électriques à proximité d'éléments électriques en fonctionnement ?", //3
        type: "multiple",
        options: ["Oui", "Non"],
        answerAffirmative: [
            "Le salarié travaille dans des armoires électriques à proximité d'éléments en fonctionnement.",
            "Le salarié ne travaille pas à proximité d'éléments électriques en fonctionnement."
        ],
        result: ["B1V", "B1"],
        next: [5, 5]
    },
    {
        question: "Le salarié travaille-t-il dans des armoires électriques à proximité d'éléments électriques en fonctionnement ?", //4
        type: "multiple",
        options: ["Oui", "Non"],
        answerAffirmative: [
            "Le salarié travaille dans des armoires électriques à proximité d'éléments en fonctionnement.",
            "Le salarié ne travaille pas à proximité d'éléments électriques en fonctionnement."
        ],
        result: ["B2V", "B2"],
        next: [5, 5]
    },
    {
        question: "Choisissez le type d'interventions que le salarié peut effectuer dans la liste suivante :", //5
        type: "multiple",
        options: [
            "Intervention générale sur tout type de circuits BT seul ou avec un exécutant sous ses ordres.",
            "Intervention élémentaire sur circuit de tension max 230 V, de type prise de courant, interrupteurs, ou éléments de type luminaires, ampoules, radiateur."
        ],
        answerAffirmative: [
            "Le salarié effectue des interventions générales sur tous types de circuits BT.",
            "Le salarié effectue des interventions élémentaires sur des circuits de faible tension."
        ],
        result: ["BR", "BS"],
        next: [6, 6]
    },
    {
        question: "Le salarié effectue-t-il des manœuvres, comme couper ou rétablir le courant dans des armoires électriques basse tension ?", //6
        type: "multiple",
        options: ["Oui", "Non"],
        answerAffirmative: [
            "Le salarié effectue des manœuvres sur des armoires électriques basse tension.",
            "Le salarié n'effectue aucune manœuvre sur des armoires électriques basse tension."
        ],
        result: ["BE manœuvre", ""],
        next: [7, 7]
    },
    {
        question: "Le salarié est-il responsable de la mise hors service des installations pour assurer la sécurité d'autres travailleurs intervenant sur l'installation (Consignation) ?", //7
        type: "multiple",
        options: ["Oui", "Non"],
        answerAffirmative: [
            "Le salarié est responsable de la mise hors service des installations pour la consignation.",
            "Le salarié n'est pas responsable de la consignation."
        ],
        result: ["BC", ""],
        next: [8, 8]
    },
    {
        question: "Le salarié doit-il pénétrer dans des locaux de haute tension (>1000V) (postes de transformation, etc.), ou travailler à proximité de réseaux de transport/distribution aériens de l'électricité ?", //8
        type: "multiple",
        options: ["Oui", "Non"],
        answerAffirmative: [
            "Le salarié doit pénétrer dans des locaux de haute tension ou travailler à proximité de réseaux aériens.",
            "Le salarié ne pénètre pas dans des locaux de haute tension et ne travaille pas à proximité de réseaux aériens."
        ],
        result: ["", ""],
        next: [9, 14]
    },
    {
        question: "Le salarié agit-il en tant que non-électricien de haute tension, exécutant électricien de haute tension ou agent de maîtrise/cadre électricien de haute tension ?", //9
        type: "multiple",
        options: ["Non Électricien", "Exécutant", "Agent de maîtrise/cadre"],
        answerAffirmative: [
            "Le salarié est un non-électricien de haute tension.",
            "Le salarié est un exécutant électricien de haute tension.",
            "Le salarié est un agent de maîtrise ou cadre électricien de haute tension."
        ],
        result: ["H0", "", ""],
        next: [10, 11, 12]
    },
    {
        question: "Le salarié travaille-t-il dans des installations de haute tension à proximité d'éléments électriques en fonctionnement ?", //10
        type: "multiple",
        options: ["Oui", "Non"],
        answerAffirmative: [
            "Le salarié travaille à proximité d'éléments électriques en fonctionnement dans des installations de haute tension.",
            "Le salarié ne travaille pas à proximité d'éléments électriques en fonctionnement dans des installations de haute tension."
        ],
        result: ["H0V", "H0"],
        next: [13, 13]
    },
    {
        question: "Le salarié travaille-t-il dans des installations de Haute Tension a proximité d'elements électriques en fonctionnement?", //11
        	type: "multiple",
        options: ["Oui", "Non"],
	answerAffirmative: [
            "Le salarié travaille à proximité d'éléments électriques en fonctionnement dans des installations de haute tension.",
            "Le salarié ne travaille pas à proximité d'éléments électriques en fonctionnement dans des installations de haute tension."
        ],

        result: ["H1V", "H1"],
        next: [13, 13]
    },
    {
        question: "Le salarié travaille-t-il dans des installations de Haute Tension a proximité d'elements électriques en fonctionnement?", //12
       	type: "multiple",
        options: ["Oui", "Non"],
	answerAffirmative: [
            "Le salarié travaille à proximité d'éléments électriques en fonctionnement dans des installations de haute tension.",
            "Le salarié ne travaille pas à proximité d'éléments électriques en fonctionnement dans des installations de haute tension."
        ],

        result: ["H2V", "H2"],
        next: [13, 13]
    },
    {
            question: "Le salarié effectue-t-il des manœuvres, comme couper ou rétablir le courant dans des locaux HT ?", //13
        options: ["Oui", "Non"],
        answerAffirmative: [
            "Le salarié effectue des manœuvres sur des installations de haute tension.",
            "Le salarié n'effectue aucune manœuvre sur des installations de haute tension."
        ],
        result: ["HE manœuvre", ""],
        next: [14, 14]
    },
    {
        question: "Le salarié est-il responsable de la mise hors service des installations pour assurer la sécurité d'autres travailleurs intervenant sur des installations HT (Consignation) ?", //14
        type: "multiple",
        options: ["Oui", "Non"],
	answerAffirmative: [
        "Le salarié est responsable de la mise hors service des installations pour assurer la sécurité des autres travailleurs (Consignation HT).",
        "Le salarié n'est pas responsable de la consignation des installations HT."
    ],

        result: ["HC", " "],
        next: [15, 15]
    },
    {
        question: "Le salarié travaille-t-il dans des tranchées de réseaux enterrés ?", //15
        type: "multiple",
        options: ["Oui", "Non"],
        answerAffirmative: [
            "Le salarié travaille dans des tranchées de réseaux enterrés.",
            "Le salarié ne travaille pas dans des tranchées de réseaux enterrés."
        ],
        result: ["BF/HF", ""],
        next: ["Fin", "Fin"]
    }
];

function updateUI() {
    // Ne rien faire si le questionnaire est terminé
    if (currentQuestion === "Fin" || currentQuestion >= questions.length) {
        displayResults();
        return;
    }

    const question = questions[currentQuestion];

    // Effacer les anciennes options et le texte de la question
    document.getElementById("multiple-choice").innerHTML = ''; // Reset
    document.getElementById("question").innerText = question.question;

    // Ajouter les boutons d'option
    question.options.forEach((option, index) => {
        let button = document.createElement("button");
        button.innerText = option;
	button.onclick = () => answerMultiple(index); // Bind event
        document.getElementById("multiple-choice").appendChild(button);
    });
}

function answerMultiple(optionIndex) {
    const question = questions[currentQuestion];
    currentIndice = question.result[optionIndex];  // Stocker l'indice sélectionné
    habilitations.push(currentIndice);

   // Ajouter la question et la réponse sous forme affirmative à la liste
    affirmations.push(question.answerAffirmative[optionIndex]);

    // Stocker la question et réponse dans la liste pour l'afficher dans displayResults
    const answeredList = document.getElementById("questions-answered");
    const listItem = document.createElement("li");
    //listItem.innerText = question.options[optionIndex];
    //answeredList.appendChild(listItem);

    // Mettre à jour la question suivante avant la transition
    currentQuestion = question.next[optionIndex];

    // Transition out (fade effect) après avoir sélectionné une réponse
    document.getElementById("questionnaire").classList.add('fade-out');

    // Après la transition, afficher la question suivante
    setTimeout(() => {
        document.getElementById("questionnaire").classList.remove('fade-out');
        updateUI();  // Mettre à jour l'UI avec la question suivante
        document.getElementById("questionnaire").classList.add('fade-in');  // Ajouter l'effet d'entrée
    }, 500);  // Durée de la transition
}

function displayResults() {
    document.getElementById("multiple-choice").style.display = "none";
    document.getElementById("question").style.display = "none";
    document.getElementById("result").innerText = "Les habilitations nécessaires pour Mr / Mme " + employeeNames.join(", ") + " sont : " + habilitations.join(" ");
    
    // Afficher les questions et réponses
    const answeredList = document.getElementById("questions-answered");
    answeredList.innerHTML = ""; // Vider la liste avant de l'afficher

    // Ajouter les affirmations
    let affirmationsText = affirmations.join("<br>");
    document.getElementById("questions-answered").innerHTML = "Merci de vos réponses, en voici une synthèse: <br><br>" + affirmationsText;
    
    showConfirmationSection();  // Affiche la section de confirmation
}


function startQuestionnaire() {
    document.getElementById("accueil").style.display = "none"; // Masque la page d'accueil
    document.getElementById("user-info").style.display = "block"; // Affiche les infos utilisateur
}

function submitUserInfo() {
    // Récupérer les valeurs des champs
    userName = document.getElementById("userName").value;
    companyName = document.getElementById("companyName").value;
    contactMail = document.getElementById("contactMail").value;
    contactPhone = document.getElementById("contactPhone").value;

    // Vérifier que les champs ne sont pas vides
    if (userName && companyName && contactMail && contactPhone) {
        // Masque la section des informations utilisateur
        document.getElementById("user-info").style.display = "none";
        showDialog();
            
        // Appelle la première question (ou la fonction d'initialisation du questionnaire)
        //updateUI();
    } else {
        alert("Veuillez remplir toutes les informations.");
    }
}
function showDialog() {
        document.getElementById('dialog').style.display = 'flex';
    }

    function closeDialog() {
        document.getElementById('dialog').style.display = 'none';
    }

    function submitNames() {
         const namesInput = document.getElementById('names-input').value;
    if (namesInput) {
        // Séparer les noms par des virgules et supprimer les espaces inutiles
        employeeNames = namesInput.split(',').map(name => name.trim()).filter(name => name !== "");
        console.log(employeeNames);
        // Masquer la boîte de dialogue
        document.getElementById('dialog').style.display = 'none';
        
        // Afficher le questionnaire
        document.getElementById("questionnaire").style.display = "block";
        
        updateUI();  // Appelle la première question
    }
    }
	// Affiche les boutons Corriger / Valider à la fin du questionnaire
function showConfirmationSection() {
	console.log(employeeNames);
    const confirmationSection = document.getElementById('confirmation-section');
    confirmationSection.style.display = 'block'; 
    const confirmationModal = document.getElementById('confirmation-modal');
    confirmationModal.style.display = 'block';  // Ouvre la modale pour confirmer
    const btnCorriger = document.getElementById('btn-corriger');
    const btnValider = document.getElementById('btn-valider');
    //const modalCorriger = document.getElementById('modal-corriger');
    const modalValider = document.getElementById('modal-valider');

    // Fonction pour gérer la validation
    btnValider.addEventListener('click', () => {
	    console.log(employeeNames);
        document.getElementById("result").innerText = "Un mail de confirmation vient de vous être envoyé, et vos informations nous sont parvenues. Nous reprendrons contact avec vous aux coordonées que vous avez fournies dans les meilleurs délais.";
	//sendEmail();
	    // Préparer les données à envoyer par email
    let emailParams = {
        to_name: "Eric", // Nom du destinataire
        from_name: userName,
	company_name: companyName,
        employee_names: employeeNames.join(", "), // Noms des salariés séparés par des virgules
        employee_indices: habilitations.join(" "), // Indices des salariés
	message: affirmations.join(" "),
	
    };
	console.log(companyName);
  emailjs.send("service_z2hpbbg", "template_zaes18r", emailParams)
        .then(function(response) {
            console.log("Email envoyé avec succès !", response.status, response.text);
        }, function(error) {
            console.error("Erreur lors de l'envoi de l'email.", error);
        });
    });

    // Fonction pour gérer le retour en arrière (corriger)
   btnCorriger.addEventListener('click', () => {
    console.log('Retour à la première question pour correction');
    
    // Réinitialiser les variables à leur état initial
    currentQuestion = 0;  // Réinitialise à la première question
    habilitations = [];   // Réinitialise la liste des habilitations
    affirmations = [];    // Réinitialise la liste des affirmations
    
    confirmationSection.style.display = 'none';  // Masque la section de confirmation
    document.getElementById("multiple-choice").style.display = "block";  // Réaffiche les choix multiples
    document.getElementById("question").style.display = "block";  // Réaffiche la question
    
    updateUI();  // Appelle la première question
});


    // Bouton Valider dans la modale 
    modalValider.addEventListener('click', () => {
        confirmationModal.style.display = 'none';  // Ferme la modale
        console.log('ok');
    });
}
// Initialisation du questionnaire
updateUI();
