import '../stream_either.dart';

extension MapStreamEitherExtension<L1, R1> on StreamEither<L1, R1> {
  StreamEither<L2, R2> mapEither<L2, R2>({
    required L2 Function(L1) left,
    required R2 Function(R1) right,
  }) =>
      MapEitherStreamTransformer(
        right: right,
        left: left,
      ).bind(this);
}
