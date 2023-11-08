import 'dart:async';

import 'package:rxdart/rxdart.dart';

final class Controller<A, B> {
  Controller({
    required Subject<A> subject,
    required Stream<B> Function(Stream<A>) transformer,
  })  : _subject = subject,
        stream = subject.transform(StreamTransformer.fromBind(transformer));

  factory Controller.withPublishSubject(
    Stream<B> Function(Stream<A>) transformer,
  ) =>
      Controller(
        transformer: transformer,
        subject: PublishSubject(),
      );

  final Stream<B> stream;

  void add(A a) {
    if (_subject.isClosed) {
      return;
    }
    _subject.add(a);
  }

  void close() {
    _subject.close();
  }

  final Subject<A> _subject;
}
