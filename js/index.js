const e = {};
['catSummon','noCatsTxt','catGrid','bgDarken','summonModal','summonModalBtnCancel','summonModalBtnAdopt','summonCatPicBg','summonCatPic','summonModalBtnCancel','summonModalBtnAdopt','summonCatNameIpt','summonCatDescIpt']
.map(k=>e[k]=document.getElementById(k))

const ImgBaseUrl = 'https://cdn2.thecatapi.com/images/'
let summoning = false
const closeModal = c=>{
    if(summoning) return
    e.bgDarken.setAttribute('data-visible', '0')
    e.summonModal.setAttribute('data-visible', '0')
}
e.bgDarken.addEventListener('click', closeModal)
e.summonModalBtnCancel.addEventListener('click', closeModal)

const error = (e,m) => {
    console.error(e)
    alert(m||'Error occured while summoning cat! :(\nMaybe it went missing?')
    closeModal()
}

let newCat
e.catSummon.addEventListener('click', c=>{
    summoning = true
    e.bgDarken.setAttribute('data-visible', '1')
    e.summonCatPicBg.style = `background-image: unset;`
    e.summonCatPic.onload = () => {}
    e.summonCatPic.onerror = () => {}
    e.summonCatPic.src = ""
    e.summonCatNameIpt.value = ""
    e.summonCatDescIpt.value = ""
    e.summonModalBtnAdopt.classList = 'btn disabled'
    newCat = undefined

    fetch('https://api.thecatapi.com/v1/images/search')
    .then(r=>r.json())
    .then(dat => {
        newCat = dat[0]
        e.summonCatPic.onload = () => e.summonModal.setAttribute('data-visible', '1')
        e.summonCatPic.onerror = () => {error(undefined,"Couldn't load cat image :(\nPerhaps it was stolen")}
        summonCatPicBg.style = `background-image: url(${newCat.url});`
        summonCatPic.src = newCat.url
    })
    .catch(error)
    .finally(()=>{summoning = false})
})
const checkInputsEmpty = c => {
    e.summonModalBtnAdopt.classList = `btn${e.summonCatNameIpt.value && e.summonCatDescIpt.value?'':' disabled'}`
}
e.summonCatNameIpt.addEventListener('input', checkInputsEmpty)
e.summonCatDescIpt.addEventListener('input', checkInputsEmpty)
e.summonModalBtnAdopt.addEventListener('click', c=>{
    if(e.summonModalBtnAdopt.classList.contains('disabled')) return
    fetch('/api/cats', {
        headers: {'Content-Type':'application/json'},
        method: 'POST',
        body: JSON.stringify({
            id: newCat.id,
            name: e.summonCatNameIpt.value,
            desc: e.summonCatDescIpt.value,
            src: newCat.url.replace(ImgBaseUrl,'')
        })
    })
    .then(r => r.text())
    .then(newCatId => window.location = `/cats/${newCatId}`)
})

// load existing cats
fetch('/db.json')
.then(res => res.json())
.then(cats => {
    const catIds = Object.keys(cats)
    if(!catIds.length) return noCatsTxt.innerHTML = 'No cats were found... D:<br><span>Try summoning one!</span>'
    catIds.map(id => {
        
        const cat = cats[id]
        const newCard = document.createElement('a')
        const img = newCard.appendChild(document.createElement('img'))
        const txt = newCard.appendChild(document.createElement('div'))
        newCard.classList = 'catCard'
        img.classList = 'catPic'
        txt.classList = 'catDesc'
        newCard.href = `/cats/${id}`
        img.src = ImgBaseUrl+cat.src
        txt.innerText = cat.name

        noCatsTxt.style.display = 'none'
        return e.catGrid.appendChild(newCard)
    })
    
})