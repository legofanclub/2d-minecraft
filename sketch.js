BLOCK_SIDE_LENGTH = 24;
CHUNK_SIDE_LENGTH = 8;
PLAYER_SIZE = 10;
DEBUG = false;
SELECTION_DISTANCE = 4;
allChunks = {};
player = null;

function setup() {
  player = new Player(200, 250);
  player.direction = -PI / 5;
  allChunks["(0,0)"] = new Chunk(0, 0);
  allChunks["(1,1)"] = new Chunk(1, 1);
  allChunks["(0,1)"] = new Chunk(0, 1);
  allChunks["(1,0)"] = new Chunk(1, 0);
  createCanvas(800, 800);
}

function draw() {
  background(220);

  movePlayer(player);

  for (let [key, chunk] of Object.entries(allChunks)) {
    drawChunk(chunk);
  }


  highlightSelectedBlock();
  highlightBlockToBuild();
  drawPlayer(player);

  fill("white")
}

function mousePressed(event) {
  if (event.button === 2) {
    // add block
    let val = getBlockToAddLocationInChunkCoords();
    if(!val){
      return null;
    }

    const [key, [x, y]] = val;

    allChunks[key].contents[y][x] = 1;
  } else if (event.button === 0) {
    // destroy block
    let val = getSelectedBlockInChunkCoords();
    if (!val) {
      return null;
    }

    const [key, [x, y]] = val;

    allChunks[key].contents[y][x] = 0;
  }
}

function getBlockToAddLocationInChunkCoords() {
  const blocksCoordsInLineOfSight = getAllBlocksCoordsInSight(player, SELECTION_DISTANCE);
  const blocksInWorld = blocksCoordsInLineOfSight.map((coord) => worldToChunkCoords(coord));

  // return the block before the filled block in our line of sight
  let prev = null;
  for ([key, [x, y]] of blocksInWorld) {
    if (allChunks[key].contents[y][x] !== 0) {
      return prev;
    }
    prev = [key, [x,y]];
  }
  return null;
}

function getSelectedBlockInChunkCoords() {
  const blocksCoordsInLineOfSight = getAllBlocksCoordsInSight(player, SELECTION_DISTANCE);
  const blocksInWorld = blocksCoordsInLineOfSight.map((coord) => worldToChunkCoords(coord));

  for ([key, [x, y]] of blocksInWorld) {
    if (allChunks[key].contents[y][x] !== 0) {
      return ([key, [x, y]]);
    }
  }
  return null;
}

function highlightSelectedBlock() {
  const val = getSelectedBlockInChunkCoords();
  if(!val){
    return;
  }
  const [key, [x,y]] = val; 

  fill("black");
  square(allChunks[key].position[0] * CHUNK_SIDE_LENGTH * BLOCK_SIDE_LENGTH + x * BLOCK_SIDE_LENGTH,
    allChunks[key].position[1] * CHUNK_SIDE_LENGTH * BLOCK_SIDE_LENGTH + y * BLOCK_SIDE_LENGTH,
    BLOCK_SIDE_LENGTH
  );
  fill("white");
}

function highlightBlockToBuild() {
  const val = getBlockToAddLocationInChunkCoords();
  if(!val){
    return;
  }
  const [key, [x,y]] = val; 

  fill("green");
  square(allChunks[key].position[0] * CHUNK_SIDE_LENGTH * BLOCK_SIDE_LENGTH + x * BLOCK_SIDE_LENGTH,
    allChunks[key].position[1] * CHUNK_SIDE_LENGTH * BLOCK_SIDE_LENGTH + y * BLOCK_SIDE_LENGTH,
    BLOCK_SIDE_LENGTH
  );
  fill("white");
}


function worldToChunkCoords(coords) {
  let [x, y] = coords;
  const chunkX = Math.floor(x / CHUNK_SIDE_LENGTH);
  const chunkY = Math.floor(y / CHUNK_SIDE_LENGTH);
  const interiorX = x % CHUNK_SIDE_LENGTH;
  const interiorY = y % CHUNK_SIDE_LENGTH;

  return ([`(${chunkX},${chunkY})`, [interiorX, interiorY]]);
}

// returns the world coordinates of all blocks in line of sight ordered from closest to farthest
function getAllBlocksCoordsInSight(player, length) {
  // algorithm taken from here: https://playtechs.blogspot.com/2007/03/raytracing-on-grid.html
  const x0 = player.x / BLOCK_SIDE_LENGTH;
  const y0 = player.y / BLOCK_SIDE_LENGTH;

  const x1 =
    (player.x - length * BLOCK_SIDE_LENGTH * sin(player.direction)) /
    BLOCK_SIDE_LENGTH;
  const y1 =
    (player.y - length * BLOCK_SIDE_LENGTH * cos(player.direction)) /
    BLOCK_SIDE_LENGTH;

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);

  let x = Math.floor(x0);
  let y = Math.floor(y0);

  DEBUG ?
    line(
      x0 * BLOCK_SIDE_LENGTH,
      y0 * BLOCK_SIDE_LENGTH,
      x1 * BLOCK_SIDE_LENGTH,
      y1 * BLOCK_SIDE_LENGTH
    ) : null;

  let dt_dx = 1.0 / dx;
  let dt_dy = 1.0 / dy;

  let t = 0;

  let n = 1;
  let x_inc, y_inc;
  let t_next_vertical, t_next_horizontal;

  if (dx === 0) {
    x_inc = 0;
    t_next_horizontal = dt_dx; // infinity
  } else if (x1 > x0) {
    x_inc = 1;
    n += Math.floor(x1) - x;
    t_next_horizontal = (Math.floor(x0) + 1 - x0) * dt_dx;
  } else {
    x_inc = -1;
    n += x - Math.floor(x1);
    t_next_horizontal = (x0 - Math.floor(x0)) * dt_dx;
  }

  if (dy === 0) {
    y_inc = 0;
    t_next_vertical = dt_dy; // infinity
  } else if (y1 > y0) {
    y_inc = 1;
    n += Math.floor(y1) - y;
    t_next_vertical = (Math.floor(y0) + 1 - y0) * dt_dy;
  } else {
    y_inc = -1;
    n += y - Math.floor(y1);
    t_next_vertical = (y0 - Math.floor(y0)) * dt_dy;
  }

  const blocksInSight = []
  for (; n > 0; n--) {
    blocksInSight.push([x, y]);

    if (t_next_vertical < t_next_horizontal) {
      y += y_inc;
      t = t_next_vertical;
      t_next_vertical += dt_dy;
    } else {
      x += x_inc;
      t = t_next_horizontal;
      t_next_horizontal += dt_dx;
    }
  }

  if (DEBUG) {
    for (let tup of blocksInSight) {
      // circle(tup[0] * BLOCK_SIDE_LENGTH, tup[1] * BLOCK_SIDE_LENGTH, 10);
      fill(255, 0, 0, 30);
      square(
        tup[0] * BLOCK_SIDE_LENGTH,
        tup[1] * BLOCK_SIDE_LENGTH,
        BLOCK_SIDE_LENGTH
      );
      fill("black");
    }
  }

  return blocksInSight;
}

function blockInside(player) {
  const x = Math.trunc(player.x / BLOCK_SIDE_LENGTH);
  const y = Math.trunc(player.y / BLOCK_SIDE_LENGTH);
  return [x, y];
}

// mutates the player
function movePlayer(player) {
  movement = createVector(0, 0);
  if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) {
    movement.y -= 1 * cos(player.direction + PI / 2);
    movement.x -= 1 * sin(player.direction + PI / 2);
  }

  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) {
    movement.y += 1 * cos(player.direction + PI / 2);
    movement.x += 1 * sin(player.direction + PI / 2);
  }

  if (keyIsDown(UP_ARROW) || keyIsDown(87)) {
    movement.y -= 1 * cos(player.direction);
    movement.x -= 1 * sin(player.direction);
  }

  if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) {
    movement.y += 1 * cos(player.direction);
    movement.x += 1 * sin(player.direction);
  }

  // rotation
  const xDelta = mouseX - player.x;
  const yDelta = mouseY - player.y;

  if(xDelta > 0){
    player.direction = -Math.atan(yDelta/xDelta) - PI/2;
  } else {
    player.direction = -Math.atan(yDelta/xDelta) - 3*PI/2;
  }

  // make sure going 2 direction at once is not faster than moving in one direction only
  movement.normalize();

  player.x += movement.x;
  player.y += movement.y;
}

function drawChunk(chunk) {
  for (let [y, row] of chunk.contents.entries()) {
    for (let [x, block] of row.entries()) {
      if (block != 0) {
        square(
          chunk.position[0] * BLOCK_SIDE_LENGTH * CHUNK_SIDE_LENGTH +
          x * BLOCK_SIDE_LENGTH,
          chunk.position[1] * BLOCK_SIDE_LENGTH * CHUNK_SIDE_LENGTH +
          y * BLOCK_SIDE_LENGTH,
          BLOCK_SIDE_LENGTH
        );
      }
    }
  }
}

function drawPlayer(player) {
  fill("red");
  circle(player.x, player.y, PLAYER_SIZE);
  translate(player.x, player.y);
  rotate(-player.direction);
  scale(0.5);
  triangle(-15, 0, 0, -30, 15, 0);
  scale(2);
  rotate(player.direction);
  translate(-player.x, -player.y);
  fill("white");
}

class Player {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
    this.direction = 0;
  }
}

class Chunk {
  constructor(x = 0, y = 0) {
    this.contents = Array.from({ length: CHUNK_SIDE_LENGTH }, () =>
      Array.from({ length: CHUNK_SIDE_LENGTH }, () => Math.random() > 0.7 ? 1 : 0)
    );
    this.position = [x, y];
  }
}
