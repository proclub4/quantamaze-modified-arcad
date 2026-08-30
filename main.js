(function(){
  "use strict";

  var overlay = document.getElementById('qam-overlay');
  var modalTag = document.getElementById('qam-modal-tag');
  var modalTitle = document.getElementById('qam-modal-title');
  var modalDesc = document.getElementById('qam-modal-desc');
  var modalBody = document.getElementById('qam-modal-body');
  var closeBtn = document.getElementById('qam-modal-close');
  var activeCleanup = null;

  var GAME_META = {
    maze: { tag: 'ARCADE // 01', title: 'Q-Maze Runner', desc: 'Use the arrow keys, WASD, or the on-screen pad to guide the qubit from the top-left to the glowing exit. Difficulty: Easy · ~1 min · Solo run — no computer opponent, just the clock.' },
    coin: { tag: 'ARCADE // 02', title: 'The Quantum Coin Flip (Superposition)', desc: 'Predict the state of the coin — heads, tails, or something a classical coin was never meant to do. Difficulty: Easy · ~30 sec · Solo — you\u2019re calling the outcome, not the machine.' },
    core: { tag: 'ARCADE // 03', title: 'Defuse the Quantum Core', desc: 'Answer short quantum questions to stabilize the reactor before your qubits decohere. Difficulty: Medium · ~2 min · Three lives, one power-up, no second reactor.' },
    ttt: { tag: 'ARCADE // 04', title: "Schrödinger's Showdown: Quantum Tic-Tac-Toe", desc: 'Place a ghost piece in two squares at once. Close a loop with your opponent and trigger a Measurement Event. Difficulty: Hard · ~3 min · You play X against a randomized Computer opponent playing O.' }
  };

  function openGame(id){
    var meta = GAME_META[id];
    if(!meta) return;
    modalTag.textContent = meta.tag;
    modalTitle.textContent = meta.title;
    modalDesc.textContent = meta.desc;
    modalBody.innerHTML = '';
    if(typeof activeCleanup === 'function'){ try{ activeCleanup(); }catch(e){} }
    activeCleanup = null;

    if(id === 'maze') activeCleanup = renderMaze(modalBody);
    if(id === 'coin') activeCleanup = renderCoin(modalBody);
    if(id === 'core') activeCleanup = renderCore(modalBody);
    if(id === 'ttt') activeCleanup = renderQTTT(modalBody);

    overlay.classList.add('qam-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(){
    overlay.classList.remove('qam-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if(typeof activeCleanup === 'function'){ try{ activeCleanup(); }catch(e){} }
    activeCleanup = null;
    modalBody.innerHTML = '';
  }

  document.querySelectorAll('[data-qam-game]').forEach(function(btn){
    btn.addEventListener('click', function(){ openGame(btn.getAttribute('data-qam-game')); });
  });
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', function(e){ if(e.target === overlay) closeModal(); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && overlay.classList.contains('qam-open')) closeModal(); });

  /* ---------------------------------------------------------------- */
  /* GAME 1: Q-MAZE RUNNER                                             */
  /* ---------------------------------------------------------------- */
  function renderMaze(container){
    var COLS = 9, ROWS = 9;
    container.innerHTML =
      '<div class="qam-maze-wrap">' +
        '<div class="qam-row" style="width:100%;max-width:320px;justify-content:space-between;">' +
          '<span class="qam-pill" id="qam-maze-timer">0.0s</span>' +
          '<button type="button" class="qam-btn qam-btn-ghost" id="qam-maze-reset">New Maze</button>' +
        '</div>' +
        '<canvas class="qam-maze-canvas" id="qam-maze-canvas" width="320" height="320"></canvas>' +
        '<div class="qam-dpad" aria-hidden="false">' +
          '<span class="qam-empty"></span><button type="button" data-dir="up" aria-label="Up">▲</button><span class="qam-empty"></span>' +
          '<button type="button" data-dir="left" aria-label="Left">◀</button><span class="qam-empty"></span><button type="button" data-dir="right" aria-label="Right">▶</button>' +
          '<span class="qam-empty"></span><button type="button" data-dir="down" aria-label="Down">▼</button><span class="qam-empty"></span>' +
        '</div>' +
        '<p class="qam-status" id="qam-maze-status">Reach the orange exit to win.</p>' +
      '</div>';

    var canvas = container.querySelector('#qam-maze-canvas');
    var ctx = canvas.getContext('2d');
    var timerEl = container.querySelector('#qam-maze-timer');
    var statusEl = container.querySelector('#qam-maze-status');
    var cellSize = canvas.width / COLS;
    var player, won, startTime, rafId, tickInterval;

    function makeMaze(){
      var grid = [];
      for(var y=0;y<ROWS;y++){
        var row = [];
        for(var x=0;x<COLS;x++){ row.push({x:x,y:y,walls:{N:true,S:true,E:true,W:true},visited:false}); }
        grid.push(row);
      }
      var stack = [];
      var current = grid[0][0];
      current.visited = true;
      var visitedCount = 1;
      var total = COLS*ROWS;
      function neighbors(cell){
        var list = [];
        var x=cell.x, y=cell.y;
        if(y>0 && !grid[y-1][x].visited) list.push({cell:grid[y-1][x], dir:'N', opp:'S'});
        if(y<ROWS-1 && !grid[y+1][x].visited) list.push({cell:grid[y+1][x], dir:'S', opp:'N'});
        if(x<COLS-1 && !grid[y][x+1].visited) list.push({cell:grid[y][x+1], dir:'E', opp:'W'});
        if(x>0 && !grid[y][x-1].visited) list.push({cell:grid[y][x-1], dir:'W', opp:'E'});
        return list;
      }
      while(visitedCount < total){
        var opts = neighbors(current);
        if(opts.length){
          var pick = opts[Math.floor(Math.random()*opts.length)];
          current.walls[pick.dir] = false;
          pick.cell.walls[pick.opp] = false;
          pick.cell.visited = true;
          visitedCount++;
          stack.push(current);
          current = pick.cell;
        } else if(stack.length){
          current = stack.pop();
        }
      }
      return grid;
    }

    var grid = makeMaze();

    function draw(){
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle = '#111';
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.strokeStyle = '#3a3a3a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for(var y=0;y<ROWS;y++){
        for(var x=0;x<COLS;x++){
          var c = grid[y][x];
          var px = x*cellSize, py = y*cellSize;
          if(c.walls.N){ ctx.moveTo(px,py); ctx.lineTo(px+cellSize,py); }
          if(c.walls.W){ ctx.moveTo(px,py); ctx.lineTo(px,py+cellSize); }
          if(x===COLS-1 && c.walls.E){ ctx.moveTo(px+cellSize,py); ctx.lineTo(px+cellSize,py+cellSize); }
          if(y===ROWS-1 && c.walls.S){ ctx.moveTo(px,py+cellSize); ctx.lineTo(px+cellSize,py+cellSize); }
        }
      }
      ctx.stroke();
      // exit
      ctx.fillStyle = 'rgba(245,89,10,0.85)';
      ctx.fillRect((COLS-1)*cellSize+cellSize*0.25, (ROWS-1)*cellSize+cellSize*0.25, cellSize*0.5, cellSize*0.5);
      // player
      ctx.beginPath();
      ctx.fillStyle = '#ffd27a';
      ctx.shadowColor = '#F5590A';
      ctx.shadowBlur = 12;
      ctx.arc(player.x*cellSize+cellSize/2, player.y*cellSize+cellSize/2, cellSize*0.28, 0, Math.PI*2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    function reset(){
      grid = makeMaze();
      player = {x:0,y:0};
      won = false;
      startTime = Date.now();
      statusEl.textContent = 'Reach the orange exit to win.';
      statusEl.className = 'qam-status';
      draw();
    }

    function move(dir){
      if(won) return;
      var c = grid[player.y][player.x];
      if(dir==='up' && !c.walls.N) player.y--;
      if(dir==='down' && !c.walls.S) player.y++;
      if(dir==='left' && !c.walls.W) player.x--;
      if(dir==='right' && !c.walls.E) player.x++;
      draw();
      if(player.x === COLS-1 && player.y === ROWS-1){
        won = true;
        var secs = ((Date.now()-startTime)/1000).toFixed(1);
        statusEl.textContent = 'Solved in ' + secs + 's! Nice work.';
        statusEl.className = 'qam-status qam-good';
      }
    }

    function keyHandler(e){
      var map = {ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right',W:'up',S:'down',A:'left',D:'right'};
      if(map[e.key]){ e.preventDefault(); move(map[e.key]); }
    }
    document.addEventListener('keydown', keyHandler);

    container.querySelectorAll('.qam-dpad button').forEach(function(btn){
      btn.addEventListener('click', function(){ move(btn.getAttribute('data-dir')); });
    });
    container.querySelector('#qam-maze-reset').addEventListener('click', reset);

    tickInterval = setInterval(function(){
      if(!won) timerEl.textContent = ((Date.now()-startTime)/1000).toFixed(1) + 's';
    }, 100);

    reset();

    return function cleanup(){
      document.removeEventListener('keydown', keyHandler);
      clearInterval(tickInterval);
      if(rafId) cancelAnimationFrame(rafId);
    };
  }

  /* ---------------------------------------------------------------- */
  /* GAME 2: QUANTUM COIN FLIP (SUPERPOSITION)                          */
  /* ---------------------------------------------------------------- */
  function renderCoin(container){
    var flipTimeout;

    function showChoice(){
      clearTimeout(flipTimeout);
      container.innerHTML =
        '<div class="qam-coin-arena" id="qam-coin-arena">' +
          '<div class="qam-coin-trail" aria-hidden="true"></div>' +
          '<div class="qam-neon-coin" id="qam-neon-coin">' +
            '<div class="qam-coin-face qam-front">H</div>' +
            '<div class="qam-coin-face qam-back">T</div>' +
          '</div>' +
        '</div>' +
        '<p class="qam-coin-status" id="qam-coin-status">Predict the state of the coin.</p>' +
        '<div class="qam-row" style="justify-content:center;gap:10px;" id="qam-coin-choices">' +
          '<button type="button" class="qam-btn qam-btn-ghost" data-guess="heads">Heads</button>' +
          '<button type="button" class="qam-btn qam-btn-ghost" data-guess="tails">Tails</button>' +
          '<button type="button" class="qam-btn qam-btn-split" data-guess="split">Split the Reality</button>' +
        '</div>';
      container.querySelectorAll('[data-guess]').forEach(function(btn){
        btn.addEventListener('click', function(){ handleGuess(btn.getAttribute('data-guess')); });
      });
    }

    function handleGuess(guess){
      var status = container.querySelector('#qam-coin-status');
      var choices = container.querySelector('#qam-coin-choices');
      if(choices) choices.remove();

      if(guess === 'split'){
        status.textContent = 'Refusing to choose…';
        flipTimeout = setTimeout(revealSplit, 700);
        return;
      }

      var arena = container.querySelector('#qam-coin-arena');
      var coin = container.querySelector('#qam-neon-coin');
      var trail = container.querySelector('.qam-coin-trail');
      status.textContent = 'Collapsing the wavefunction…';

      flipTimeout = setTimeout(function(){
        var outcome = Math.random() < 0.5 ? 'heads' : 'tails';
        if(trail) trail.style.display = 'none';
        coin.classList.add('qam-collapsed');
        coin.style.transform = outcome === 'heads' ? 'rotateY(0deg)' : 'rotateY(180deg)';
        arena.classList.add('qam-clink');

        var correct = guess === outcome;
        var outcomeLabel = outcome === 'heads' ? 'Heads' : 'Tails';
        status.innerHTML = 'Result: <strong>' + outcomeLabel + '</strong>. You guessed ' + (correct ? 'Correctly.' : 'Incorrectly.');

        var warn = document.createElement('p');
        warn.className = 'qam-warning';
        warn.innerHTML = '⚠️ Warning: You just collapsed the universe into a single timeline. You are thinking like a 1980s microchip.';
        status.insertAdjacentElement('afterend', warn);

        var chest = document.createElement('div');
        chest.className = 'qam-chest';
        chest.innerHTML = '<span class="qam-chest-icon" aria-hidden="true">🔒🪙</span><span class="qam-chest-text"><strong>Quantum Rewards Locked.</strong> Play again to unlock.</span>';
        warn.insertAdjacentElement('afterend', chest);

        appendReplay();
      }, 900);
    }

    function revealSplit(){
      var arena = container.querySelector('#qam-coin-arena');
      var status = container.querySelector('#qam-coin-status');

      var COUNT = 10;
      var coinsHtml = '';
      for(var i=0;i<COUNT;i++){
        var angle = (360/COUNT)*i;
        coinsHtml += '<div class="qam-reality-coin" style="transform:rotateY(' + angle + 'deg) translateZ(58px)">' + (i % 2 === 0 ? 'H' : 'T') + '</div>';
      }
      arena.innerHTML =
        '<div class="qam-flash" aria-hidden="true"></div>' +
        '<div class="qam-reality-sphere" id="qam-reality-sphere">' +
          '<div class="qam-reality-core" aria-hidden="true"></div>' +
          coinsHtml +
        '</div>';

      status.innerHTML = '🌀 Reality Fractured! You didn\'t just guess the coin—you became the observer.';

      var welcome = document.createElement('p');
      welcome.className = 'qam-coin-explain';
      welcome.textContent = 'Welcome to the Quantum Realm. You just trapped a qubit in a state of infinite possibilities.';
      status.insertAdjacentElement('afterend', welcome);

      var followUp = document.createElement('p');
      followUp.className = 'qam-coin-explain';
      followUp.textContent = "In our world, a coin must be flat. In the quantum world, the coin is spinning in a sealed box. It is 100% Heads and 100% Tails at the exact same millisecond. By choosing \u2018Split,\u2019 you refused to force it to choose. You just mastered superposition.";
      welcome.insertAdjacentElement('afterend', followUp);

      appendReplay();
    }

    function appendReplay(){
      var row = document.createElement('div');
      row.className = 'qam-row';
      row.style.justifyContent = 'center';
      row.innerHTML = '<button type="button" class="qam-btn" id="qam-coin-replay">Flip again</button>';
      container.appendChild(row);
      container.querySelector('#qam-coin-replay').addEventListener('click', showChoice);
    }

    showChoice();
    return function cleanup(){ clearTimeout(flipTimeout); };
  }


  /* ---------------------------------------------------------------- */
  /* GAME 3: DEFUSE THE QUANTUM CORE                                    */
  /* ---------------------------------------------------------------- */
  function renderCore(container){
    var QUESTIONS = [
      { q: 'What can a qubit do that a classical bit cannot?', opts: ['Only ever be 0', 'Only ever be 1', 'Be 0 and 1 at the same time', 'Store letters instead of numbers'], correct: 2 },
      { q: 'What is it called when a measured qubit settles into one definite value?', opts: ['Superposition', 'Entanglement', 'Measurement collapse', 'Tunneling'], correct: 2 },
      { q: 'Two qubits linked so that measuring one instantly affects the other are:', opts: ['Superposed', 'Entangled', 'Isolated', 'Classical'], correct: 1 },
      { q: 'If two entangled qubits are correlated and one is measured as 0, the other is:', opts: ['Unrelated to it', 'Instantly correlated too', 'Erased', 'Always 1'], correct: 1, entangleWith: 2 },
      { q: 'Which symbol is commonly used for a qubit in the "0" state?', opts: ['|0⟩', '0!', 'Q-0', 'Ø'], correct: 0 },
      { q: 'What do we call unwanted noise that disturbs a qubit\'s fragile state?', opts: ['Amplification', 'Superposition', 'Decoherence', 'Interference only'], correct: 2 }
    ];

    var qIndex = 0, lives = [true, true, true], powerupUsed = false, finished = false;
    var correctMap = {}, eliminatedMap = {};

    function livesHtml(){
      return lives.map(function(alive){
        if(alive) return '<div class="qam-life-orb"></div>';
        return '<div class="qam-life-orb qam-decohered"><span class="qam-life-glitch"><span>0</span><span>1</span></span></div>';
      }).join('');
    }

    function showQuestion(){
      var q = QUESTIONS[qIndex];
      var hintNote = '';
      if(q.entangleWith !== undefined && correctMap[q.entangleWith] && !eliminatedMap[qIndex]){
        var wrongIdx = -1;
        for(var w=0; w<q.opts.length; w++){ if(w !== q.correct){ wrongIdx = w; break; } }
        eliminatedMap[qIndex] = [wrongIdx];
        hintNote = '<p class="qam-core-hint">🔗 Entangled bonus: your correct answer on the linked sector removed one wrong option.</p>';
      } else if(hintNote === '' && eliminatedMap[qIndex] && eliminatedMap[qIndex].length && q.entangleWith !== undefined){
        hintNote = '<p class="qam-core-hint">🔗 Entangled bonus already applied to this sector.</p>';
      }
      if(!eliminatedMap[qIndex]) eliminatedMap[qIndex] = [];

      container.innerHTML =
        '<div class="qam-core-header">' +
          '<div class="qam-core-lives">' + livesHtml() + '</div>' +
          '<span class="qam-pill">Sector ' + (qIndex+1) + ' / ' + QUESTIONS.length + '</span>' +
          '<button type="button" class="qam-core-power" id="qam-core-power"' + (powerupUsed ? ' disabled' : '') + '>⚡ Superposition (1 use)</button>' +
        '</div>' +
        hintNote +
        '<p class="qam-core-question">' + q.q + '</p>' +
        '<div id="qam-core-options"></div>' +
        '<p class="qam-status" id="qam-core-status"></p>';

      var optWrap = container.querySelector('#qam-core-options');
      q.opts.forEach(function(opt, i){
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'qam-quiz-option';
        btn.textContent = opt;
        if(eliminatedMap[qIndex].indexOf(i) !== -1){
          btn.classList.add('qam-opt-eliminated');
          btn.disabled = true;
        }
        btn.addEventListener('click', function(){ answer(i); });
        optWrap.appendChild(btn);
      });

      var powerBtn = container.querySelector('#qam-core-power');
      powerBtn.addEventListener('click', function(){
        if(powerupUsed) return;
        powerupUsed = true;
        var wrongIndices = [];
        for(var i=0;i<q.opts.length;i++){ if(i !== q.correct && eliminatedMap[qIndex].indexOf(i) === -1) wrongIndices.push(i); }
        for(var r=wrongIndices.length-1;r>0;r--){ var s=Math.floor(Math.random()*(r+1)); var t=wrongIndices[r]; wrongIndices[r]=wrongIndices[s]; wrongIndices[s]=t; }
        var toRemove = wrongIndices.slice(0, Math.max(0, wrongIndices.length - 1));
        toRemove.forEach(function(i){ eliminatedMap[qIndex].push(i); });
        container.querySelector('#qam-core-status').textContent = '⚡ Superposition activated — down to a 50/50.';
        showQuestion();
      });
    }

    function answer(i){
      var q = QUESTIONS[qIndex];
      var optWrap = container.querySelector('#qam-core-options');
      var buttons = optWrap.querySelectorAll('.qam-quiz-option');
      buttons.forEach(function(b){ b.disabled = true; });
      var status = container.querySelector('#qam-core-status');
      var correct = i === q.correct;

      if(correct){
        buttons[i].classList.add('qam-opt-correct');
        correctMap[qIndex] = true;
        status.textContent = '✅ Correct!';
        status.className = 'qam-status qam-good';
      } else {
        buttons[i].classList.add('qam-opt-wrong');
        buttons[q.correct].classList.add('qam-opt-correct');
        var idx = lives.indexOf(true);
        if(idx !== -1) lives[idx] = false;
        status.textContent = '❌ Incorrect — a qubit decohered.';
        status.className = 'qam-status qam-bad';
      }

      setTimeout(function(){
        if(lives.indexOf(true) === -1){
          showEnd(false);
        } else if(qIndex === QUESTIONS.length - 1){
          showEnd(true);
        } else {
          qIndex++;
          showQuestion();
        }
      }, 1000);
    }

    function showEnd(won){
      finished = true;
      container.innerHTML =
        '<div class="qam-core-endcard">' +
          '<div class="qam-core-lives" style="justify-content:center;margin-bottom:12px;">' + livesHtml() + '</div>' +
          '<h4>' + (won ? 'Quantum Core Stabilized!' : 'Reactor Collapsed Into Decoherence') + '</h4>' +
          '<p class="qam-status ' + (won ? 'qam-good' : 'qam-bad') + '" style="text-align:center;">' +
            (won ? 'All sectors cleared with ' + lives.filter(Boolean).length + ' qubit(s) still stable.' : 'All three qubits decohered before the core could be stabilized.') +
          '</p>' +
          '<button type="button" class="qam-btn" id="qam-core-replay" style="margin-top:8px;">Restart mission</button>' +
        '</div>';
      container.querySelector('#qam-core-replay').addEventListener('click', function(){
        qIndex = 0; lives = [true,true,true]; powerupUsed = false; finished = false;
        correctMap = {}; eliminatedMap = {};
        showQuestion();
      });
    }

    showQuestion();
    return function cleanup(){};
  }

  /* ---------------------------------------------------------------- */
  /* GAME 4: SCHRÖDINGER'S SHOWDOWN — QUANTUM TIC-TAC-TOE                */
  /* ---------------------------------------------------------------- */
  function renderQTTT(container){
    var LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    var HUMAN = 'X', COMPUTER = 'O';
    var cells, moves, moveCounter, currentPlayer, selected, pendingMeasurement, gameOver, winner;
    var cpuTimer = null;

    function init(){
      cells = [];
      for(var i=0;i<9;i++) cells.push({ classical: null, marks: [] });
      moves = {};
      moveCounter = 0;
      currentPlayer = 'X';
      selected = null;
      pendingMeasurement = null;
      gameOver = false;
      winner = null;
      if(cpuTimer){ clearTimeout(cpuTimer); cpuTimer = null; }
      render();
    }

    function isComputerTurn(){
      return !gameOver && currentPlayer === COMPUTER;
    }

    function cpuPickMeasurement(pm){
      return Math.random() < 0.5 ? pm.a : pm.b;
    }

    function cpuPickMove(){
      var empties = [];
      for(var i=0;i<9;i++) if(!cells[i].classical) empties.push(i);
      // shuffle
      for(var j=empties.length-1;j>0;j--){
        var k = Math.floor(Math.random()*(j+1));
        var tmp = empties[j]; empties[j] = empties[k]; empties[k] = tmp;
      }
      return { a: empties[0], b: empties[1] };
    }

    function maybeScheduleComputer(){
      if(cpuTimer){ clearTimeout(cpuTimer); cpuTimer = null; }
      if(!isComputerTurn()) return;
      cpuTimer = setTimeout(function(){
        cpuTimer = null;
        if(gameOver || currentPlayer !== COMPUTER) return;
        if(pendingMeasurement){
          if(pendingMeasurement.player === COMPUTER) resolveMeasurement(cpuPickMeasurement(pendingMeasurement));
          return;
        }
        var mv = cpuPickMove();
        if(mv.a === undefined || mv.b === undefined) return;
        makeMove(mv.a, mv.b);
      }, 550);
    }

    function buildUF(){
      var parent = {};
      function find(x){
        if(parent[x] === undefined) parent[x] = x;
        if(parent[x] !== x) parent[x] = find(parent[x]);
        return parent[x];
      }
      function union(x,y){ var rx = find(x), ry = find(y); if(rx !== ry) parent[rx] = ry; }
      Object.keys(moves).forEach(function(id){
        var mv = moves[id];
        if(mv.resolved) return;
        union(mv.a, mv.b);
      });
      return find;
    }

    function makeMove(a,b){
      var find = buildUF();
      var willCycle = find(a) === find(b);
      moveCounter++;
      var id = moveCounter;
      moves[id] = { id: id, player: currentPlayer, a: a, b: b, resolved: false };
      cells[a].marks.push(id);
      cells[b].marks.push(id);
      selected = null;

      if(willCycle){
        pendingMeasurement = { moveId: id, a: a, b: b, player: currentPlayer };
        render();
      } else {
        finishMoveSequence();
      }
    }

    function resolveMeasurement(chosenCell){
      var pm = pendingMeasurement;
      if(!pm) return;
      var move = moves[pm.moveId];
      var queue = [];

      function resolveCellForMove(cell, mv){
        if(mv.resolved) return;
        mv.resolved = true;
        cells[cell].classical = mv.player;
        queue.push(cell);
      }

      resolveCellForMove(chosenCell, move);

      while(queue.length){
        var c = queue.shift();
        Object.keys(moves).forEach(function(id){
          var mv = moves[id];
          if(mv.resolved) return;
          if(mv.a === c || mv.b === c){
            var other = mv.a === c ? mv.b : mv.a;
            if(cells[other].classical){
              mv.resolved = true;
              return;
            }
            resolveCellForMove(other, mv);
          }
        });
      }

      cells.forEach(function(cell){
        cell.marks = cell.marks.filter(function(id){ return !moves[id].resolved; });
      });

      pendingMeasurement = null;
      finishMoveSequence();
    }

    function checkWin(){
      for(var i=0;i<LINES.length;i++){
        var l = LINES[i];
        var v = cells[l[0]].classical;
        if(v && cells[l[1]].classical === v && cells[l[2]].classical === v) return v;
      }
      return null;
    }

    function isDraw(){
      var empty = cells.filter(function(c){ return !c.classical; }).length;
      return empty < 2;
    }

    function finishMoveSequence(){
      var win = checkWin();
      if(win){ gameOver = true; winner = win; render(); return; }
      if(isDraw()){ gameOver = true; winner = 'draw'; render(); return; }
      currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
      selected = null;
      render();
    }

    function handleCellClick(index){
      if(gameOver) return;
      if(isComputerTurn()) return;
      if(pendingMeasurement){
        if(pendingMeasurement.player !== HUMAN) return;
        if(index === pendingMeasurement.a || index === pendingMeasurement.b) resolveMeasurement(index);
        return;
      }
      if(cells[index].classical) return;
      if(selected === null){ selected = index; render(); return; }
      if(selected === index){ selected = null; render(); return; }
      var a = selected, b = index;
      makeMove(a,b);
    }

    function playerLabel(p){
      return p === HUMAN ? 'You (X)' : 'Computer (O)';
    }

    function statusText(){
      if(gameOver){
        if(winner === 'draw') return 'Stalemate — the wavefunction never resolved. It\u2019s a draw.';
        if(winner === HUMAN) return '\uD83C\uDFC6 You collapsed reality and win!';
        return '\uD83C\uDFC6 The Computer collapsed reality and wins!';
      }
      if(pendingMeasurement){
        if(pendingMeasurement.player === COMPUTER) return '\u26A1 Measurement Event! Computer is choosing which square becomes real\u2026';
        return '\u26A1 Measurement Event! Your call \u2014 choose which square becomes real.';
      }
      if(currentPlayer === COMPUTER) return '\uD83E\uDD16 Computer is thinking\u2026';
      if(selected !== null){
        return 'Your turn: pick a second square to complete your Quantum Move.';
      }
      return 'Your turn \u2014 select two empty squares for a Quantum Move.';
    }

    function cellHtml(i){
      var cell = cells[i];
      var classes = ['qam-ttt-cell'];
      if(cell.classical) classes.push('qam-ttt-cell--solid', cell.classical === 'X' ? 'qam-ttt-x' : 'qam-ttt-o');
      if(selected === i) classes.push('qam-ttt-cell--selected');
      if(pendingMeasurement){
        if(i === pendingMeasurement.a || i === pendingMeasurement.b) classes.push('qam-ttt-cell--collapse-choice');
        else classes.push('qam-ttt-cell--dim');
      }

      var inner = '';
      if(cell.classical){
        inner = '<span class="qam-ttt-mark">' + cell.classical + '</span>';
      } else if(cell.marks.length){
        inner = '<span class="qam-ttt-ghosts">' + cell.marks.map(function(id){
          var mv = moves[id];
          return '<span class="qam-ttt-ghost qam-ttt-ghost-' + mv.player + '">' + mv.player + '<sub>' + id + '</sub></span>';
        }).join('') + '</span>';
      }

      var cpuTurn = isComputerTurn();
      var disabled = (cell.classical && !pendingMeasurement) || (cpuTurn && !cell.classical && !pendingMeasurement) ? ' disabled' : '';
      if(pendingMeasurement && pendingMeasurement.player === COMPUTER) disabled = ' disabled';
      return '<button type="button" class="' + classes.join(' ') + '" data-cell="' + i + '"' + disabled + '>' + inner + '</button>';
    }

    function render(){
      var html = '<p class="qam-ttt-intro">You\u2019re X, the Computer is O. Select two empty squares to place a ghost piece there at once. When your ghost pieces close a loop, reality forces a Measurement Event.</p>';
      html += '<p class="qam-ttt-status" id="qam-ttt-status">' + statusText() + '</p>';
      html += '<div class="qam-ttt-board" id="qam-ttt-board">';
      for(var i=0;i<9;i++) html += cellHtml(i);
      html += '</div>';
      if(gameOver){
        html += '<div class="qam-row" style="justify-content:center;margin-top:16px;"><button type="button" class="qam-btn" id="qam-ttt-replay">Play again</button></div>';
      } else {
        html += '<div class="qam-row" style="justify-content:center;margin-top:16px;"><button type="button" class="qam-btn qam-btn-ghost" id="qam-ttt-reset">Restart</button></div>';
      }
      container.innerHTML = html;

      if(gameOver){
        container.querySelector('#qam-ttt-replay').addEventListener('click', init);
      } else {
        container.querySelector('#qam-ttt-reset').addEventListener('click', init);
        container.querySelectorAll('[data-cell]').forEach(function(btn){
          btn.addEventListener('click', function(){ handleCellClick(parseInt(btn.getAttribute('data-cell'), 10)); });
        });
      }
      maybeScheduleComputer();
    }

    init();
    return function cleanup(){ if(cpuTimer){ clearTimeout(cpuTimer); cpuTimer = null; } };
  }

})();
