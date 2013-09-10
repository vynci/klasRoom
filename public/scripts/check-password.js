var password = document.getElementById("password"),
    strength = document.getElementById("strength"),
    submit = document.getElementById("submit");
    

password.addEventListener('keyup', function () {
    var score = zxcvbn(password.value).score;
    if (score < 2) {
        strength.value = strength.className = "weak";
    }
    if (score === 2) {
        strength.value = strength.className = "so-so";
    }
    if (score > 2) {
        strength.value = strength.className = "strong";
    }
})

