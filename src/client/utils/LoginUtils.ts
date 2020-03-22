export function createLogin(onJoin: (username: string) => void) {
  const loginElement = document.querySelector(".js-login");

  const usernameElement = document.querySelector(".js-user-name") as HTMLInputElement;
  usernameElement.addEventListener("keyup", event => {
    if (~[13, 3].indexOf(event.keyCode)) { // Enter (Win, Mac)
      joinRoom();
    }
  });

  const joinButtonElement = document.querySelector(".js-join-button") as HTMLButtonElement;
  joinButtonElement.addEventListener("click", event => {
    joinRoom();
  });

  function joinRoom() {
    onJoin(usernameElement.value);

    document.body.removeChild(loginElement);
  }

}

