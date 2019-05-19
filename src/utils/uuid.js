// https://gist.github.com/jed/982883
function uuid(length) {
  const id = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, a =>
    (a ^ ((Math.random() * 16) >> (a / 4))).toString(16)
  );
  return length ? id.substring(0, length) : id;
}

module.exports = uuid;
