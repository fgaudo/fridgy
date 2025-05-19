export const refreshTime: HomeCommand = Eff.gen(function* () {
	const time = yield* Cl.currentTimeMillis
	return Message.RefreshTimeResult({
		timestamp: time,
	})
})
export const queueLoading: (id: symbol) => HomeCommand = id =>
	Eff.gen(function* () {
		yield* Eff.sleep(`150 millis`)
		return Message.ShowSpinner({ id })
	})

export const queueRemoveToast: (id: symbol) => HomeCommand = id =>
	Eff.gen(function* () {
		yield* Eff.logDebug(`Executed command to queue toast removal`)
		yield* Eff.sleep(`3 seconds`)
		return Message.RemoveToast({ id })
	})
