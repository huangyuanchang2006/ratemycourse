import { reviewPayload } from "./rules.js";

// Owns author/revision context and write sequencing. No DOM or navigation.
export function createContributionFlow({
  client,
  identity,
  invalidate = () => {},
  validateTerm = () => {},
}) {
  let previous = null,
    actor = "",
    phase = "editing",
    prepared = null,
    pending = null,
    epoch = 0,
    opening = 0;
  const reject = (code) => {
    throw Object.assign(new Error(code), { code });
  };
  function clearContext() {
    epoch++;
    previous = null;
    actor = "";
    phase = "editing";
    prepared = null;
  }
  function reset() {
    opening++;
    clearContext();
  }
  return {
    reset,
    get current() {
      return previous;
    },
    get previewing() {
      return phase === "preview";
    },
    get saving() {
      return !!pending;
    },
    async begin(id = "", isCurrent = () => true) {
      if (!isCurrent()) reject("staleView");
      const request = ++opening,
        user = identity.session?.user.id;
      if (!user) reject("loginRequired");
      // A new view cannot replace the context of an already issued write.
      if (pending) await pending.catch(() => {});
      if (request !== opening || !isCurrent()) reject("staleView");
      if (identity.session?.user.id !== user) reject("loginRequired");
      clearContext();
      const turn = epoch;
      const result = id
        ? await client.rpc("my_course_reviews", { p_id: id })
        : { data: [], error: null };
      if (result.error) throw result.error;
      if (turn !== epoch || request !== opening || !isCurrent())
        reject("staleView");
      if (identity.session?.user.id !== user) reject("loginRequired");
      previous = result.data?.[0] || null;
      actor = user;
      return previous;
    },
    edit() {
      if (pending) return;
      phase = "editing";
      prepared = null;
    },
    prepare(values) {
      if (pending) reject("saveInProgress");
      if (!actor || identity.session?.user.id !== actor)
        reject("loginRequired");
      validateTerm(values.term, previous);
      const payload = reviewPayload(
        values,
        identity.profile,
        actor,
        "",
        previous,
      );
      prepared = { ...values };
      phase = "preview";
      return payload;
    },
    submit() {
      if (pending) return pending;
      if (phase !== "preview" || !prepared) reject("previewRequired");
      const turn = epoch,
        user = actor,
        values = { ...prepared },
        review = previous;
      phase = "saving";
      const request = (async () => {
        await identity.getProfile();
        if (identity.session?.user.id !== user || turn !== epoch)
          reject("loginRequired");
        if (!identity.complete(identity.profile)) reject("incompleteProfile");
        validateTerm(values.term, review);
        const payload = reviewPayload(
          values,
          identity.profile,
          user,
          "",
          review,
        );
        const result = review
          ? await client.rpc("edit_my_course_review", {
              p_id: review.id,
              p_revision: review.content_revision,
              p_payload: payload,
            })
          : await client.from("reviews").insert(payload).select("id").single();
        if (result.error) throw result.error;
        if (!result.data?.id) reject("notReady");
        invalidate();
        if (epoch === turn) phase = "saved";
        // A completed server write remains successful if the user has left this context.
        return {
          ...result.data,
          contextCurrent: identity.session?.user.id === user && turn === epoch,
        };
      })();
      const completion = request.finally(() => {
        if (pending === completion) {
          pending = null;
          if (epoch === turn && phase === "saving") phase = "preview";
        }
      });
      pending = completion;
      return completion;
    },
    async mine() {
      const result = await client.rpc("my_course_reviews");
      if (result.error) throw result.error;
      return result.data || [];
    },
    async appeal(id, revision, note) {
      const result = await client.rpc("request_course_review_human", {
        p_id: id,
        p_revision: Number(revision),
        p_note: String(note || "").trim(),
      });
      if (result.error) throw result.error;
    },
  };
}
