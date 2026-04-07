export function createLocation() {
	let lat = $state<null | number>(null);
	let lng = $state<null | number>(null);
	let error = $state<null | string>(null);
	let loading = $state(true);

	function getLocation() {
		if (!navigator.geolocation) {
			error = 'Geolocation not supported';
			return;
		}

		loading = true;

		navigator.geolocation.getCurrentPosition(
			({ coords }) => {
				lat = coords.latitude;
				lng = coords.longitude;
				loading = false;
			},
			(err) => {
				error = err.message;
				loading = false;
			},
			{ enableHighAccuracy: false, maximumAge: 20000 }
		);
	}

	function watchLocation() {
		const id = navigator.geolocation.watchPosition(
			({ coords }) => {
				lat = coords.latitude;
				lng = coords.longitude;
			},
			(err) => {
				error = err.message;
			}
		);

		return () => navigator.geolocation.clearWatch(id); // cleanup
	}

	return {
		get lat() {
			return lat;
		},
		get lng() {
			return lng;
		},
		get error() {
			return error;
		},
		get loading() {
			return loading;
		},
		getLocation,
		watchLocation
	};
}
