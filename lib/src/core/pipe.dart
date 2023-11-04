import 'dart:async';

import 'package:rxdart/rxdart.dart';

final class Pipe<A, B> {
  const Pipe({
    required Subject<A> subject,
    required StreamTransformer<A, B> transformer,
  })  : _subject = subject,
        _transformer = transformer;

  final Subject<A> _subject;
  final StreamTransformer<A, B> _transformer;

  void add(A a) {
    if (_subject.isClosed) {
      return;
    }
    _subject.add(a);
  }

  void close() {
    _subject.close();
  }

  Stream<B> get stream => _subject.transform(_transformer);
}
