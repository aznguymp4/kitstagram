const e = {};
['catPicBg','catPic','catName','adoptTime','catDesc','voteBarFill','upvotes','votePercent','downvotes','upvoteBtn','downvoteBtn','commentCount','catComments','commentPostBtn','commentUsernameIpt','commentIpt','replyToTxt','cancelReply','replyToName']
.map(k=>e[k]=document.getElementById(k))
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const catId = window.location.pathname.split('/').splice(-1)[0]

const ImgBaseUrl = 'https://cdn2.thecatapi.com/images/'
function insertAfter(referenceNode, newNode) {
	referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}
function formatTime(ISOstring) {
	const dateTime = new Date(ISOstring)
	const now = Date.now();
	let hours = dateTime.getHours();
	let minutes = dateTime.getMinutes();
	const ampm = hours >= 12 ? 'PM' : 'AM';
	hours = hours % 12;
	hours = hours ? hours : 12; // the hour '0' should be '12'
	minutes = minutes < 10 ? '0'+minutes : minutes;
	const strTime = hours + ':' + minutes + ' ' + ampm;
	const diff = now-dateTime.getTime();
	if(diff<864e5) { // 24hr
		return 'Today at '+strTime;
	} else if(diff<1728e5) { // 48hr
		return 'Yesterday at '+strTime;
	} else {
		return dateTime.toLocaleDateString();
	}
}
if(!localStorage.catVotes) localStorage.catVotes = "{}"
let catVotes = JSON.parse(localStorage.catVotes)
const updateCatVotes = () => localStorage.catVotes = JSON.stringify(catVotes)

let commentAmt = 0
let replyTo
const updateCommentCount = () => e.commentCount.textContent = `Comments・${commentAmt}`
const loadComment = (comment, commentId) => {
	const main = document.createElement('div')
	const upper = main.appendChild(document.createElement('div'))
	const txt = main.appendChild(document.createElement('div'))
	const username = upper.appendChild(document.createElement('div'))
	const date = upper.appendChild(document.createElement('div'))
	const actions = upper.appendChild(document.createElement('div'))
	const deleteBtn = actions.appendChild(document.createElement('button'))
	const replyBtn = actions.appendChild(document.createElement('button'))
	const recipientComment = document.getElementById(`comment-${comment.replyTo}`)

	main.classList = `comment${comment.replyTo?' reply':''}`
	upper.classList = 'upperComment'
	txt.classList = 'txt'
	username.classList = 'username'
	date.classList = 'date'
	actions.classList = 'commentActions'
	deleteBtn.classList = 'btn'
	replyBtn.classList = 'btn'
	
	main.tabIndex = '0'
	main.id = `comment-${commentId}`
	username.textContent = comment.name
	date.textContent = formatTime(comment.time)
	txt.textContent = comment.txt
	deleteBtn.textContent = 'Delete'
	replyBtn.textContent = 'Reply'
	deleteBtn.setAttribute('data-action', 'delete')
	replyBtn.setAttribute('data-action', 'reply')
	main.style = `--data-depth:${comment.replyTo? +(recipientComment.style.cssText.match(/\d/g))+1 : '0'}`

	replyBtn.addEventListener('click', c => {
		replyTo = commentId
		e.replyToTxt.setAttribute('data-visible','1')
		e.replyToName.textContent = comment.name
	})
	deleteBtn.addEventListener('click', c => {
		if(!confirm(`Are you sure you want to delete ${comment.name}'${comment.name.endsWith('s')?'':'s'} comment?\n\n"${comment.txt}"`)) return
		fetch(`/api/cats/${catId}/comments/${commentId}`, {method: 'DELETE'})
		.then(r => r.json())
		.then(res => {
			if(!res.success) return alert('Error deleting comment!')
			commentAmt = res.newCount
			updateCommentCount()
			res.deletedIds.map(id => {
				const toDelete = document.getElementById(`comment-${id}`)
				if(toDelete) toDelete.remove()
			})
		})
		.catch(e => {
			console.error(e)
			alert('Error deleting comment!')
		})
	})
	
	if(comment.replyTo) {
		main.setAttribute('replyTo', comment.replyTo)
		insertAfter(recipientComment, main)
	} else {
		e.catComments.appendChild(main)
	}
	commentAmt++
	updateCommentCount()
}
const cancelReply = c => {
	replyTo = undefined
	e.replyToTxt.removeAttribute('data-visible')
	e.replyToName.textContent = ''
}
e.cancelReply.addEventListener('click', cancelReply)

const checkInputsEmpty = c => {
	const valid = e.commentUsernameIpt.value && e.commentIpt.value
	e.commentPostBtn.classList = `btn${valid?'':' disabled'}`
	return valid
}
e.commentUsernameIpt.addEventListener('input', checkInputsEmpty)
e.commentIpt.addEventListener('input', checkInputsEmpty)
e.commentPostBtn.addEventListener('click', c => {
	if(!checkInputsEmpty()) return
	fetch(`/api/cats/${catId}/comments`, {
		headers: {'Content-Type': 'application/json'},
		method: 'POST',
		body: JSON.stringify({
			name: e.commentUsernameIpt.value,
			txt: e.commentIpt.value,
			replyTo
		})
	})
	.then(r=>r.json())
	.then(newComment => {
		e.commentUsernameIpt.value = ''
		e.commentIpt.value = ''
		cancelReply()
		checkInputsEmpty()
		loadComment(newComment, newComment.id)
	})
	.catch(e => {
		console.error(e)
		alert('Error posting comment!')
	})
})

fetch(`/api/cats/${catId}`)
.then(res => res.json())
.then(catData => {
	// init page
	document.title += ` ・ ${catData.name}`

	// load image
	e.catPic.src = ImgBaseUrl+catData.src
	e.catPicBg.style = `background-image: url(${ImgBaseUrl+catData.src});`

	// load name and caption
	e.catName.textContent = catData.name
	e.catDesc.textContent = catData.desc
	e.adoptTime.textContent = `Adopted: ${formatTime(catData.time)}`

	const loadVotes = votes => {
		const totalVotes = votes[0]+votes[1]
		e.upvotes.textContent = votes[0]
		e.downvotes.textContent = votes[1]
		e.votePercent.textContent = `${totalVotes? Math.round(votes[0]/totalVotes*100) : '0'}%`
		voteBarFill.style = `width: calc(100%*(${votes[0]}/${totalVotes}));`
	
		const currVote = catVotes[catData.id]
		if(!isNaN(currVote)) {
			// reversed because ternary operator is TRUE FALSE (1,0), not FALSE TRUE, (0,1)
			e[`${currVote?'down':'up'}voteBtn`].setAttribute('data-fixedpos', currVote?'down':'up')
			e[`${currVote?'up':'down'}voteBtn`].setAttribute('data-fixedpos', '')
		}
	}
	loadVotes(catData.votes)

	// handle vote buttons
	;[e.upvoteBtn, e.downvoteBtn].map((btn,i) => {
		btn.addEventListener('click', c => {
			const prevVote = catVotes[catData.id]
			if(!isNaN(prevVote) && prevVote === i) return

			fetch(`/api/cats/${catData.id}/votes`, {
				headers: {'Content-Type':'application/json'},
				method: 'PUT',
				body: JSON.stringify({
					decrementOldVote: !isNaN(catVotes[catData.id])? catVotes[catData.id] : false,
					voteType: i
				})
			}).then(r=>r.json())
			.then(newVotes => {
				catVotes[catData.id] = i
				updateCatVotes()
				loadVotes(newVotes)
			})
		})
	})

	// load comments
	for (const commentId in catData.comments) {
		const comment = catData.comments[commentId]
		if(!comment) continue
		loadComment(comment, commentId)
	}
})
.catch(e => {
	console.error(e)
	alert('Error locating cat! :(\nTaking a step back...')
	setTimeout(()=>{window.location = '/'}, 750)
})